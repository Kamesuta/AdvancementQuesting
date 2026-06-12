# Minecraft プラグイン統合設計

## 概要

Web エディタ（React SPA）と同じ REST API を Paper プラグイン内に実装する。
これにより追加サーバーなしで本番運用できる。

---

## アーキテクチャ

```
Minecraft サーバー (Paper 1.21)
├── AdvancementQuesting.jar
│   ├── HTTP サーバー (Javalin 6.x, port 8080 デフォルト)
│   │   ├── /               → dist/ の静的ファイル配信
│   │   └── /api/*          → REST API ハンドラ
│   ├── データ層
│   │   ├── quests/*.json   → クエスト定義ファイル (CRUD)
│   │   └── quest.db        → SQLite (進捗・セッション・提案)
│   ├── イベントリスナー
│   │   └── AdvancementListener → Advancement 達成 → 進捗更新
│   └── コマンドハンドラ
│       └── /quest 系コマンド
└── plugins/AdvancementQuesting/
    ├── config.yml
    ├── quests/
    │   └── *.json
    └── quest.db
```

---

## 使用ライブラリ

| ライブラリ | バージョン | 用途 |
|-----------|---------|-----|
| Paper API | 1.21.1  | Bukkit API |
| Javalin | 6.x | 組み込み HTTP サーバー |
| SQLite JDBC | 3.x | SQLite 接続 |
| Gson | 2.x (Bukkit 同梱) | JSON シリアライズ |
| Undertow または Jetty | Javalin 依存 | HTTP 実装 |

> **Javalin を選んだ理由:** Paper 上で動くシンプルな組み込み HTTP サーバーが必要。
> Javalin は Kotlin/Java フレンドリーで mock-server の Express と同じ感覚で書ける。
> Netty ベースの選択肢（NanoHTTPD 等）も検討したが、Javalin の方がルーティングが簡潔。

---

## 実装計画

### Step 1: HTTP サーバー起動

**ファイル:** `AdvancementQuesting.java`

```java
@Override
public void onEnable() {
    saveDefaultConfig();
    int port = getConfig().getInt("web-port", 8080);

    // Javalin サーバー起動
    app = Javalin.create(config -> {
        config.staticFiles.add("/dist", Location.CLASSPATH); // ビルド済みフロントエンド
    }).start(port);

    // API ルーティング
    new AuthRoutes(this).register(app);
    new QuestRoutes(this).register(app);
    new ProgressRoutes(this).register(app);
    new ProposalRoutes(this).register(app);

    getLogger().info("Web UI available at http://localhost:" + port);
}

@Override
public void onDisable() {
    if (app != null) app.stop();
}
```

---

### Step 2: SQLite 初期化

**ファイル:** `db/DatabaseManager.java`

```java
public class DatabaseManager {
    private final Connection conn;

    public DatabaseManager(Plugin plugin) throws SQLException {
        File dbFile = new File(plugin.getDataFolder(), "quest.db");
        conn = DriverManager.getConnection("jdbc:sqlite:" + dbFile.getAbsolutePath());
        conn.createStatement().execute("PRAGMA journal_mode=WAL");
        migrate();
    }

    private void migrate() throws SQLException {
        // テーブル作成 DDL を resources/migrations/ から読み込んで実行
        // player_sessions, auth_codes, player_progress, quest_proposals, proposal_votes
    }
}
```

---

### Step 3: 認証コード生成コマンド

**コマンド:** `/quest code`

```java
// AuthCodeCommand.java
public boolean onCommand(CommandSender sender, Command cmd, String label, String[] args) {
    if (!(sender instanceof Player player)) return true;

    String code = String.format("%06d", ThreadLocalRandom.current().nextInt(1_000_000));
    Instant expiresAt = Instant.now().plusSeconds(300); // 5分

    String role = determineRole(player); // OP → editor, aq.editor → editor, else player
    db.insertAuthCode(code, player.getUniqueId().toString(), player.getName(), role, expiresAt);

    player.sendMessage(ChatColor.GOLD + "認証コード: " + ChatColor.WHITE + ChatColor.BOLD + code);
    player.sendMessage(ChatColor.GRAY + "有効期限: 5分");
    return true;
}
```

---

### Step 4: セッション認証ミドルウェア

**ファイル:** `api/middleware/AuthMiddleware.java`

```java
public class AuthMiddleware {
    public static SessionInfo requireAuth(Context ctx, DatabaseManager db) {
        String authHeader = ctx.header("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new UnauthorizedResponse("No token");
        }
        String token = authHeader.substring(7);
        SessionInfo session = db.getSession(token);
        if (session == null || session.expiresAt().isBefore(Instant.now())) {
            throw new UnauthorizedResponse("Invalid or expired token");
        }
        return session;
    }
}
```

---

### Step 5: クエスト API (ファイルベース)

**ファイル:** `api/QuestRoutes.java`

```java
// GET /api/quests
app.get("/api/quests", ctx -> {
    List<Quest> quests = questManager.loadAll();
    String statusFilter = ctx.queryParam("status");
    if (statusFilter != null) {
        quests = quests.stream()
            .filter(q -> q.status().equals(statusFilter))
            .toList();
    }
    ctx.json(quests);
});

// PUT /api/quests/:id
app.put("/api/quests/{id}", ctx -> {
    SessionInfo session = AuthMiddleware.requireAuth(ctx, db);
    if (!session.isEditor()) { ctx.status(403); return; }

    String id = ctx.pathParam("id");
    Quest updated = ctx.bodyAsClass(Quest.class);
    questManager.save(id, updated);
    ctx.json(updated);
});
```

**ファイル:** `data/QuestManager.java`

```java
public class QuestManager {
    private final File questsDir;
    private final Gson gson;

    public List<Quest> loadAll() {
        // quests/ ディレクトリの全 .json を読み込んでリスト返却
    }

    public void save(String id, Quest quest) {
        // quests/{id}.json に書き出し
    }

    public void delete(String id) {
        // quests/{id}.json を削除
    }
}
```

---

### Step 6: Advancement リスナー

**ファイル:** `listener/AdvancementListener.java`

```java
@EventHandler
public void onAdvancement(PlayerAdvancementDoneEvent event) {
    Player player = event.getPlayer();
    String advancementKey = event.getAdvancement().getKey().toString();
    // advancementKey = "minecraft:story/mine_stone"

    // 全クエストを走査して advancementId が一致する条件を探す
    for (Quest quest : questManager.loadAll()) {
        for (Condition cond : quest.conditions()) {
            if ("advancement".equals(cond.type()) && advancementKey.equals(cond.advancementId())) {
                progressManager.markConditionComplete(
                    player.getUniqueId().toString(),
                    quest.id(),
                    cond.id()
                );
            }
        }
    }
}
```

---

### Step 7: 静的ファイル配信

ビルド済みフロントエンド (`web/dist/`) を JAR に組み込む。
Maven ビルド時に `web/dist/` をリソースディレクトリとして追加する。

**pom.xml 追記:**
```xml
<build>
  <resources>
    <resource>
      <directory>src/main/resources</directory>
    </resource>
    <resource>
      <directory>web/dist</directory>
      <targetPath>dist</targetPath>
    </resource>
  </resources>
</build>
```

SPA のルーティングのため、未知パスは `index.html` を返す:
```java
app.error(404, ctx -> {
    if (!ctx.path().startsWith("/api")) {
        ctx.result(getClass().getResourceAsStream("/dist/index.html"))
           .contentType("text/html");
    }
});
```

---

### Step 8: フロントエンドの API URL 設定

本番時はプラグインの HTTP サーバーがすべてを提供するため、
Vite proxy は不要。フロントエンドは相対パス `/api/*` でアクセスすればよい。

**`web/vite.config.ts`:**
- 開発時: Vite proxy で `localhost:3000` へ転送
- 本番ビルド: proxy なし → `dist/` がサーバー同一オリジンから配信される

---

## コマンド仕様

### プレイヤー向け

| コマンド | 説明 |
|---------|------|
| `/quest` | Web UI の URL をチャットに表示 |
| `/quest code` | 6桁認証コードを生成 |
| `/quest progress` | 進行中クエスト一覧をチャットに表示 |

### 管理者向け

| コマンド | 説明 |
|---------|------|
| `/quest reload` | config + クエスト JSON を再読み込み |
| `/quest give <player> <questId>` | クエストを強制付与 |
| `/quest reset <player>` | 進捗リセット |
| `/quest approve <proposalId>` | 提案を承認 |
| `/quest reject <proposalId> [理由]` | 提案を却下 |

---

## ディレクトリ構成（Java 側）

```
src/main/java/com/kamesuta/advancementquesting/
├── AdvancementQuesting.java      # メインクラス
├── api/
│   ├── AuthRoutes.java
│   ├── QuestRoutes.java
│   ├── ProgressRoutes.java
│   ├── ProposalRoutes.java
│   └── middleware/
│       └── AuthMiddleware.java
├── command/
│   ├── QuestCommand.java
│   └── subcommand/
│       ├── CodeSubCommand.java
│       ├── ReloadSubCommand.java
│       └── ...
├── data/
│   ├── Quest.java               # record / POJO
│   ├── QuestManager.java        # JSON ファイル CRUD
│   └── db/
│       ├── DatabaseManager.java
│       ├── SessionDao.java
│       ├── AuthCodeDao.java
│       ├── ProgressDao.java
│       └── ProposalDao.java
└── listener/
    └── AdvancementListener.java
```

---

## TODO

### 🔴 高優先 (Phase W5 必須)

- [ ] `pom.xml` に Javalin + SQLite JDBC を追加
- [ ] `DatabaseManager.java` — SQLite 初期化・マイグレーション
- [ ] `AuthRoutes.java` — `/api/auth/code`・`/api/auth/me`・`/api/auth/logout`
- [ ] `SessionDao.java` / `AuthCodeDao.java` — セッション管理
- [ ] `QuestManager.java` — JSON ファイル CRUD
- [ ] `QuestRoutes.java` — CRUD エンドポイント
- [ ] `CodeSubCommand.java` — `/quest code` コマンド
- [ ] `AdvancementQuesting.java` — Javalin 起動・停止
- [ ] 静的ファイル配信 (`web/dist/` → JAR 組み込み)

### 🟡 中優先

- [ ] `ProgressRoutes.java` — 進捗 API
- [ ] `AdvancementListener.java` — Advancement 連携
- [ ] `ProposalRoutes.java` — 提案 API（承認時に JSON ファイル書き出し）
- [ ] `QuestCommand.java` — `/quest` サブコマンド体系
- [ ] `config.yml` — ポート番号・その他設定

### 🟢 低優先（将来対応）

- [ ] プレイヤー通知（タイトル・アクションバー・サウンド）
- [ ] 床面マップ表示
- [ ] 報酬自動付与（アイテム・経験値・コマンド実行）
- [ ] `/quest reset` / `/quest give` 管理コマンド
- [ ] Advancement 自動生成（クエスト専用タブ）

---

## Mock サーバーとの API 互換性チェックリスト

本番プラグインが Mock と同じ契約を満たしているかの確認項目:

- [ ] `POST /api/auth/code` → トークン返却
- [ ] `GET /api/auth/me` → セッション情報返却
- [ ] `DELETE /api/auth/logout` → ハード削除
- [ ] `GET /api/quests` → 全クエスト（`mapPosition` 含む）
- [ ] `POST /api/quests` → 新規作成
- [ ] `PUT /api/quests/:id` → 更新
- [ ] `DELETE /api/quests/:id` → 削除
- [ ] `GET /api/progress` → 自分の進捗
- [ ] `GET /api/proposals` → 提案一覧（`mapPosition`・`questSnapshot` 付き）
- [ ] `POST /api/proposals` → 提案投稿
- [ ] `POST /api/proposals/:id/vote` → 投票
- [ ] `POST /api/proposals/:id/approve` → 承認（JSON ファイル書き出し）
- [ ] `POST /api/proposals/:id/reject` → 却下

---

## 注意事項

- **CORS:** Vite dev server からアクセスする開発時は CORS 許可が必要。本番は同一オリジン。
- **スレッド安全性:** Javalin は Jetty スレッドプールで動作するため、Paper のメインスレッドとは別。
  Bukkit API（プレイヤー操作・イベント発火）はスケジューラ経由でメインスレッドに戻すこと:
  ```java
  Bukkit.getScheduler().runTask(plugin, () -> { /* Bukkit API */ });
  ```
- **ファイルロック:** クエスト JSON への同時書き込みを防ぐため `ReentrantReadWriteLock` を使う。
- **クエスト ID:** Mock は UUID を使用。本番も `UUID.randomUUID()` で統一する。
