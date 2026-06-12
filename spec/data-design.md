# データ設計

## クエストデータの持ち方

### Mock サーバー（開発・テスト）

開発時は SQLite の `quests` テーブルで全データを管理する。
マップ座標（`mapPosition`）もクエストテーブルの `map_position` カラムに格納する。

### 本番プラグイン

クエストの**定義データ**（構造・条件・報酬・マップ座標）は **JSON ファイルで管理**する。SQLには入れない。

```
plugins/AdvancementQuesting/
├── quests/
│   ├── 00000000-0000-0000-0000-000000000001.json
│   ├── 00000000-0000-0000-0000-000000000002.json
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

---

## クエスト JSON スキーマ（本番）

```json
{
  "id": "00000000-0000-0000-0000-000000000001",
  "title": "基本",
  "description": "クエストの説明文",
  "icon": "oak_log",
  "category": "序盤",
  "prerequisites": [],
  "conditions": [
    {
      "id": "c1",
      "type": "item",
      "itemType": "oak_log",
      "label": "原木を集める",
      "count": 8
    },
    {
      "id": "c2",
      "type": "advancement",
      "advancementId": "minecraft:story/mine_stone",
      "label": "石を掘る"
    },
    {
      "id": "c3",
      "type": "checkmark",
      "label": "クラフトを確認する"
    }
  ],
  "rewards": [
    {
      "id": "r1",
      "type": "item",
      "itemType": "wooden_pickaxe",
      "label": "木のツルハシ",
      "count": 1
    },
    {
      "id": "r2",
      "type": "experience",
      "label": "経験値",
      "amount": 50
    }
  ],
  "mapPosition": { "x": 200, "y": 150 },
  "customButtons": [],
  "status": "public",
  "creatorUuid": null,
  "createdAt": "2026-06-12T00:00:00.000Z",
  "updatedAt": "2026-06-12T00:00:00.000Z"
}
```

> **注意:** `mapPosition` は本番では `maps/default.json` に分離することも検討中。
> Mock では `quests` テーブルの `map_position` カラムに格納している。

---

## SQLite スキーマ（Mock サーバー）

Drizzle ORM の `schema.ts` が単一の真実のソース。

### quests テーブル

```sql
CREATE TABLE quests (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    description  TEXT,
    icon         TEXT,
    category     TEXT,
    prerequisites TEXT NOT NULL DEFAULT '[]',  -- JSON 配列
    conditions   TEXT NOT NULL DEFAULT '[]',   -- JSON 配列
    rewards      TEXT NOT NULL DEFAULT '[]',   -- JSON 配列
    map_position TEXT,                         -- JSON {x,y} または NULL
    custom_buttons TEXT NOT NULL DEFAULT '[]', -- JSON 配列
    status       TEXT NOT NULL DEFAULT 'draft',  -- draft|proposed|public|hidden
    creator_uuid TEXT,
    created_at   INTEGER NOT NULL,
    updated_at   INTEGER NOT NULL
);
```

### player_progress テーブル

```sql
CREATE TABLE player_progress (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    player_uuid  TEXT NOT NULL,
    quest_id     TEXT NOT NULL REFERENCES quests(id),
    progress     TEXT NOT NULL DEFAULT '[]',  -- JSON 配列（各条件の達成状況）
    completed    INTEGER NOT NULL DEFAULT 0,  -- BOOLEAN
    reward_claimed INTEGER NOT NULL DEFAULT 0,
    started_at   INTEGER NOT NULL,
    completed_at INTEGER,
    UNIQUE (player_uuid, quest_id)
);
```

### player_sessions テーブル

```sql
CREATE TABLE player_sessions (
    session_token TEXT PRIMARY KEY,
    player_uuid   TEXT NOT NULL,
    player_name   TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'player',  -- player|editor|admin
    ip_address    TEXT,
    created_at    INTEGER NOT NULL,
    expires_at    INTEGER NOT NULL
);
```

セッション削除はハード削除（`DELETE`）。再ログイン時は同じトークンを upsert する。

### auth_codes テーブル

```sql
CREATE TABLE auth_codes (
    code        TEXT PRIMARY KEY,    -- 6桁数字
    player_uuid TEXT NOT NULL,
    player_name TEXT NOT NULL,
    created_at  INTEGER NOT NULL,
    expires_at  INTEGER NOT NULL,
    used        INTEGER NOT NULL DEFAULT 0
);
```

### quest_proposals テーブル

```sql
CREATE TABLE quest_proposals (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    quest_id      TEXT NOT NULL REFERENCES quests(id),
    proposer_uuid TEXT NOT NULL,
    proposer_name TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending',  -- pending|approved|rejected
    votes_up      INTEGER NOT NULL DEFAULT 0,
    votes_down    INTEGER NOT NULL DEFAULT 0,
    reject_reason TEXT,
    created_at    INTEGER NOT NULL
);
```

提案内容は `quests` テーブルに `status='proposed'` で直接格納し、`quest_proposals` は `quest_id` で参照する。
`votes_up` / `votes_down` は `proposal_votes` からの集計結果をキャッシュとして保持する。

### proposal_votes テーブル

```sql
CREATE TABLE proposal_votes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    proposal_id INTEGER NOT NULL REFERENCES quest_proposals(id),
    player_uuid TEXT NOT NULL,
    vote_type   TEXT NOT NULL,  -- up|down
    voted_at    INTEGER NOT NULL,
    UNIQUE (proposal_id, player_uuid)
);
```

---

## SQLite スキーマ（本番プラグイン）

本番プラグインでは `quests` テーブルは使わない（JSON ファイル管理）。
プレイヤーデータのみ SQLite で管理する:

- `player_progress`（Mock と同じスキーマ）
- `player_sessions`（Mock と同じスキーマ）
- `auth_codes`（Mock と同じスキーマ）
- `quest_proposals`（スキーマは同じだが、承認時に JSON ファイルへ書き出す）
- `proposal_votes`（Mock と同じスキーマ）

---

## エディタ型と API 型の対応

Web エディタの内部型 → API/ファイル型への変換:

```
EditorNode.{x,y}       ─── save ───► Quest.mapPosition.{x,y}
EditorNode.title       ─── save ───► Quest.title
EditorNode.icon        ─── save ───► Quest.icon
EditorEdge             ─── save ───► Quest.prerequisites[] の相互参照
EditorCondition        ─── save ───► Quest.conditions[]
EditorReward           ─── save ───► Quest.rewards[]
```

保存時は `PUT /api/quests/:id` を全クエスト分一括で呼び出す。
削除されたノードは `DELETE /api/quests/:id`、追加されたノードは `POST /api/quests`。

---

## シードデータ（テスト用固定 ID）

E2E テスト安定のため `seed.ts` では固定の連番 ID を upsert する:

| ID | ファイル名（本番） | タイトル | 状態 |
|----|----------------|--------|------|
| `1` | `00001_基本.json` | 基本 | public |
| `2` | `00002_石器時代.json` | 石器時代 | public |
| `3` | `00003_ダイヤの輝き.json` | ダイヤの輝き | public |
| `4` | `00004_ネザーの扉.json` | ネザーの扉 | draft |

- Mock の `quests.id` は `INTEGER AUTOINCREMENT` だが、seed 時は `onConflictDoUpdate` で 1〜4 を強制挿入する
- `data-node-id` 属性には `String(quest.id)` ("1", "2", ...) が使われる
- Playwright のセレクタ例: `[data-node-id="1"]`
