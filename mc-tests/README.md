# mc-tests — Minecraft E2E テスト

Mineflayer でサーバーに接続し、プラグインの挙動を実際のクライアントから検証する。

## 前提条件

- Java 21+
- Node.js 18+
- Maven (プラグインビルド用)

## セットアップ & 実行

```bash
cd mc-tests
npm install
npm test
```

`npm test` を実行すると以下が自動で行われる:

1. **Paper JAR ダウンロード** (`run/paper.jar` がなければ)
2. **設定ファイル上書き** (`run-template/` → `run/` に毎回コピー)
3. **プラグイン JAR ビルド** (`mvn package -DskipTests`)
4. **プラグイン JAR コピー** → `run/plugins/AdvancementQuesting.jar`
5. **テスト用 Minecraft サーバー起動** (ポート 25599、オフラインモード)
6. **テスト実行**
7. **サーバー停止**

`run-template/` はテンプレートとして Git 管理される。  
`run/` はテスト実行のたびに上書きされ、Git 除外される。  
（マイクラサーバーは起動すると設定ファイルを書き換えるため、テンプレートから毎回復元する）

## オプション

```bash
# ビルドをスキップ (target/ の JAR をそのまま使う)
npm run test:no-build

# サーバーが起動済みの場合にテストだけ実行 (手動テスト用サーバー向け)
npm run test:direct
```

## 環境変数

| 変数 | デフォルト | 説明 |
|------|---------|-----|
| `MC_HOST` | `localhost` | Minecraft サーバーホスト |
| `MC_PORT` | `25599` | Minecraft サーバーポート |
| `API_BASE` | `http://localhost:8090` | プラグインの HTTP API ベース URL |
| `API_PORT` | `8090` | API ポート (setup.js 用) |
| `RCON_PORT` | `25598` | RCON ポート |
| `RCON_PASS` | `testpass` | RCON パスワード |

## テスト内容

### `/quest コマンド & 認証 API`
- `/quest` → Web URL がチャットに表示される
- `/quest code` → 6桁コードがチャットに表示される
- コード → `POST /api/auth/code` → トークン取得
- トークン → `GET /api/auth/me` → プレイヤー情報返却
- `DELETE /api/auth/logout` → セッション削除 → 以降 `/me` が 401
- 無効コードは 401
- コードの使い回し不可（2回目は 401）

### `GET /api/quests`
- 認証なしで一覧取得可
- `status=public` フィルタ動作確認
- 存在しない ID は 404

### アイテム進捗 & クエスト完了
- item 条件付きクエストを作成
- アイテム拾得で進捗が更新される
- EntityPickupItemEvent の登録確認

### クエスト完了通知
- クエスト完了時のチャットメッセージ
- SSE ストリームへの `quest_complete` イベント配信

### Minecraft ⇔ ブラウザ統合
- RCON でアイテムを summon → ボットが拾う
- ブラウザに SSE でクエスト完了演出が届く

## Git 管理について

- `server/eula.txt`, `server/server.properties`, `server/bukkit.yml`, `server/spigot.yml`, `server/config.yml` → Git 管理
- `server/paper.jar`, `server/world/`, `server/logs/` → `.gitignore` で除外
- `server/plugins/AdvancementQuesting.jar` → ビルド時に自動コピー、Git 除外
