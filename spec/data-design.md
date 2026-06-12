# データ設計

## クエストデータの持ち方: ファイルベース JSON

### 決定と根拠

クエストの**定義データ**（構造・タスク・報酬・マップ座標）は **JSON ファイルで管理**する。SQLには入れない。

```
plugins/AdvancementQuesting/
├── quests/
│   ├── quest_abc123.json
│   ├── quest_def456.json
│   └── ...
└── maps/
    └── default.json        # ノード座標・エッジ一覧
```

**理由:**

| 観点 | JSON ファイル | SQL |
|------|-------------|-----|
| Git 管理 | ◎ diff が読める、PR レビュー可 | ✗ バイナリ or dump が必要 |
| 管理者の直接編集 | ◎ テキストエディタで編集可 | ✗ SQL クライアントが必要 |
| バックアップ | ◎ ファイルコピーで完結 | △ dump が必要 |
| 構造の複雑さ | ◎ ネスト JSON が自然 | △ JSON カラムで表現するか正規化が必要 |
| 検索・集計 | △ 全件読み込みが必要 | ◎ SQL クエリが使える |
| トランザクション | ✗ ファイル単位のアトミック性のみ | ◎ ACID 保証 |

クエスト数は多くとも数百件規模であり、検索・集計の優位性より**可搬性・差分可読性**を優先する。

### クエスト JSON スキーマ

```json
{
  "id": "quest_abc123",
  "title": "最初の一歩",
  "subtitle": "木を切って世界へ踏み出そう",
  "description": "原木を8個集めてクラフトの基礎を学ぶ。",
  "icon": "oak_log",
  "tags": ["序盤", "採集"],
  "tasks": [
    {
      "id": "t1",
      "type": "item",
      "itemType": "oak_log",
      "value": "原木を集める",
      "count": 8
    },
    {
      "id": "t2",
      "type": "advancement",
      "advancementId": "minecraft:story/mine_stone",
      "value": "石を掘る"
    },
    {
      "id": "t3",
      "type": "checkmark",
      "value": "クラフトを確認する"
    }
  ],
  "rewards": [
    {
      "id": "r1",
      "type": "item",
      "itemType": "wooden_pickaxe",
      "value": "木のツルハシ",
      "count": 1
    },
    {
      "id": "r2",
      "type": "experience",
      "value": "経験値",
      "amount": 50
    },
    {
      "id": "r3",
      "type": "command",
      "value": "称号付与",
      "command": "/lp user {player} permission set quest.novice"
    }
  ],
  "rewardTableId": null,
  "prerequisites": ["quest_xyz789"],
  "status": "public",
  "creatorUuid": null,
  "createdAt": "2026-06-12T00:00:00Z",
  "updatedAt": "2026-06-12T00:00:00Z"
}
```

### マップ JSON スキーマ

クエストの座標・エッジはクエスト本体とは別の `maps/default.json` で管理する。
エディタが保存するのもこのファイル。

```json
{
  "id": "default",
  "nodes": [
    { "questId": "quest_abc123", "x": 200, "y": 150 },
    { "questId": "quest_def456", "x": 400, "y": 150 }
  ],
  "edges": [
    { "id": "e1", "source": "quest_abc123", "target": "quest_def456" }
  ]
}
```

---

## プレイヤーデータの持ち方: SQLite (プラグイン側)

プレイヤーごとの**進捗・セッション・投票**は頻繁に読み書きされ、トランザクション安全性が必要なため SQLite で管理する。

### テーブル設計

#### player_progress

```sql
CREATE TABLE player_progress (
    player_uuid  TEXT NOT NULL,
    quest_id     TEXT NOT NULL,
    -- 各タスクの達成状態を JSON 配列で保持
    -- [{ "taskId": "t1", "completed": true, "count": 8 }, ...]
    task_states  TEXT NOT NULL DEFAULT '[]',
    completed    INTEGER NOT NULL DEFAULT 0,  -- BOOLEAN
    reward_claimed INTEGER NOT NULL DEFAULT 0,
    started_at   INTEGER NOT NULL,            -- Unix timestamp
    completed_at INTEGER,
    PRIMARY KEY (player_uuid, quest_id)
);
```

`task_states` の各要素:

```json
{ "taskId": "t1", "completed": true, "count": 8 }
```

- `taskId` はクエスト JSON の `tasks[].id` を参照（外部キーなし、ファイルベースのため）
- クエスト JSON が変更されても旧 `taskId` の行は残り、マッピングできないものは無視する

#### player_sessions

```sql
CREATE TABLE player_sessions (
    session_token TEXT PRIMARY KEY,
    player_uuid   TEXT NOT NULL,
    player_name   TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'player',  -- 'player' | 'editor' | 'admin'
    ip_address    TEXT,
    created_at    INTEGER NOT NULL,
    expires_at    INTEGER NOT NULL
);
```

`role` はセッション発行時にプラグイン側の権限情報から決定する。
Webサーバーはトークンを検証するだけで権限判定できる。

#### auth_codes

```sql
CREATE TABLE auth_codes (
    code        TEXT PRIMARY KEY,    -- 6桁数字
    player_uuid TEXT NOT NULL,
    player_name TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'player',
    created_at  INTEGER NOT NULL,
    expires_at  INTEGER NOT NULL,
    used        INTEGER NOT NULL DEFAULT 0
);
```

#### proposals (提案)

```sql
CREATE TABLE proposals (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    -- 提案内容は JSON スナップショットとして保持
    -- 承認時にそのまま quest JSON として書き出す
    quest_snapshot TEXT NOT NULL,
    proposer_uuid TEXT NOT NULL,
    proposer_name TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending',  -- 'pending'|'approved'|'rejected'
    reject_reason TEXT,
    created_at    INTEGER NOT NULL,
    updated_at    INTEGER NOT NULL
);
```

#### proposal_votes

```sql
CREATE TABLE proposal_votes (
    proposal_id  INTEGER NOT NULL REFERENCES proposals(id),
    player_uuid  TEXT NOT NULL,
    vote_type    TEXT NOT NULL,  -- 'up' | 'down'
    voted_at     INTEGER NOT NULL,
    PRIMARY KEY (proposal_id, player_uuid)
);
```

`votes_up` / `votes_down` カウンタは `proposal_votes` の集計クエリで取得し、`proposals` テーブルには持たない（二重管理を避ける）。

---

## エディタ型とAPI型の対応

Webエディタ（`editor/types.ts`）は描画用の内部型を持つ。保存時にAPI型へ変換する。

```
EditorNode  ─── save ───► Quest JSON (ファイル) + MapPosition (maps/default.json)
EditorEdge  ─── save ───► maps/default.json の edges[]
EditorTask  ─── save ───► Quest.tasks[]
EditorReward ── save ───► Quest.rewards[]
```

### 変換ルール

| エディタ型 | API/ファイル型 | 備考 |
|-----------|--------------|------|
| `EditorNode.icon` | `Quest.icon` | そのまま |
| `EditorNode.{x,y}` | `MapNode.{x,y}` | マップファイルへ分離 |
| `EditorTask.type` | `Quest.tasks[].type` | `'checkmark'`/`'item'`/`'advancement'`/`'command'` |
| `EditorTask.itemType` | `Quest.tasks[].itemType` | `type==='item'` の時のみ |
| `EditorTask.value` | `Quest.tasks[].value` | 表示名 or コマンド文字列 |
| `EditorEdge` | `MapEdge` | マップファイルへ |

---

## 報酬テーブル

複数クエストで共有できる報酬セットを別ファイルで管理する。

```
plugins/AdvancementQuesting/
└── reward_tables/
    ├── table_lv.json
    └── table_mv.json
```

```json
{
  "id": "table_lv",
  "name": "LV 報酬",
  "rewards": [
    { "id": "r1", "type": "item", "itemType": "iron_ingot", "count": 16 }
  ]
}
```

クエスト JSON から `"rewardTableId": "table_lv"` で参照する。
報酬テーブルが設定されている場合、個別 `rewards[]` より優先して適用する。
