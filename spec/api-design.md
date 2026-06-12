# API 設計

## 基本方針

- REST / JSON
- 認証: `Authorization: Bearer <token>` ヘッダー
- 権限レベル: `player` < `editor` < `admin`
- エラーレスポンス: `{ "error": "メッセージ" }`
- タイムスタンプ: ISO 8601 文字列 (`2026-06-12T00:00:00Z`)

---

## 権限モデル

| ロール | 付与条件 | できること |
|--------|---------|-----------|
| `player` | ゲームにログイン済みの全プレイヤー | クエスト閲覧、進捗確認、提案投稿・投票 |
| `editor` | OP または専用権限ノード `aq.editor` | クエスト作成・編集・削除、提案の承認/却下 |
| `admin` | OP | editor の全権 + ユーザー管理 |

ロールはセッション発行時（認証コード生成時）にプラグイン側で決定し、セッショントークンに紐付ける。Webサーバーはトークン検証の結果として受け取るだけで、権限を独自に判定しない。

---

## 認証 API

### POST /api/auth/code
6桁コードでセッションを確立する。

**権限:** 不要

**リクエスト:**
```json
{ "code": "123456" }
```

**レスポンス 200:**
```json
{
  "token": "uuid-...",
  "playerUuid": "550e8400-...",
  "playerName": "Steve",
  "role": "player"
}
```

**エラー:**
- `400` コード未入力
- `401` コードが無効 / 期限切れ / 使用済み

---

### GET /api/auth/me
現在のセッション情報を返す。

**権限:** 全ロール

**レスポンス 200:**
```json
{
  "playerUuid": "550e8400-...",
  "playerName": "Steve",
  "role": "player"
}
```

**エラー:**
- `401` トークンなし / 無効 / 期限切れ

---

### DELETE /api/auth/logout
セッションを無効化する。

**権限:** 全ロール

**レスポンス 204:** (body なし)

---

## クエスト API

### GET /api/quests
クエスト一覧を返す。マップ座標も含む。

**権限:** 全ロール（`status=draft` は `editor`/`admin` のみ表示）

**クエリパラメータ:**

| パラメータ | 型 | デフォルト | 説明 |
|-----------|---|----------|------|
| `status` | `public\|draft\|hidden` | `public` | フィルタ (editor+ は全件取得可) |
| `tag` | string | - | タグで絞り込み |

**レスポンス 200:**
```json
[
  {
    "id": "quest_abc123",
    "title": "最初の一歩",
    "subtitle": "木を切って世界へ踏み出そう",
    "icon": "oak_log",
    "tags": ["序盤"],
    "status": "public",
    "prerequisites": [],
    "mapPosition": { "x": 200, "y": 150 },
    "taskCount": 3,
    "rewardCount": 2
  }
]
```

一覧では `tasks` / `rewards` の全内容は返さない（帯域節約）。

---

### GET /api/quests/:id
クエスト詳細を返す。

**権限:** 全ロール（draft は editor+）

**レスポンス 200:**
```json
{
  "id": "quest_abc123",
  "title": "最初の一歩",
  "subtitle": "木を切って世界へ踏み出そう",
  "description": "原木を8個集めてクラフトの基礎を学ぶ。",
  "icon": "oak_log",
  "tags": ["序盤", "採集"],
  "tasks": [
    { "id": "t1", "type": "item", "itemType": "oak_log", "value": "原木を集める", "count": 8 },
    { "id": "t2", "type": "advancement", "advancementId": "minecraft:story/mine_stone", "value": "石を掘る" },
    { "id": "t3", "type": "checkmark", "value": "クラフトを確認する" }
  ],
  "rewards": [
    { "id": "r1", "type": "item", "itemType": "wooden_pickaxe", "value": "木のツルハシ", "count": 1 },
    { "id": "r2", "type": "experience", "value": "経験値", "amount": 50 }
  ],
  "rewardTableId": null,
  "prerequisites": [],
  "mapPosition": { "x": 200, "y": 150 },
  "status": "public",
  "creatorUuid": null,
  "createdAt": "2026-06-12T00:00:00Z",
  "updatedAt": "2026-06-12T00:00:00Z"
}
```

---

### POST /api/quests
クエストを新規作成する。

**権限:** `editor`, `admin`

**リクエスト:** クエスト JSON (`id` / `createdAt` / `updatedAt` を除く全フィールド)

**レスポンス 201:** 作成されたクエスト全体

---

### PUT /api/quests/:id
クエストを更新する。部分更新可（PATCH 相当の挙動）。

**権限:** `editor`, `admin`

**リクエスト:** 更新したいフィールドのみ

**レスポンス 200:** 更新後のクエスト全体

---

### DELETE /api/quests/:id
クエストを削除する（ファイルを削除し、マップからも除去）。

**権限:** `admin`

**レスポンス 204:** (body なし)

---

## マップ API

### GET /api/map
デフォルトマップのノード座標・エッジ一覧を返す。

**権限:** 全ロール

**レスポンス 200:**
```json
{
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

### PUT /api/map
エディタの保存操作。マップ全体を上書きする。

**権限:** `editor`, `admin`

**リクエスト:** `GET /api/map` と同じ形式

**レスポンス 200:** 保存後のマップ

---

## プレイヤー進捗 API

### GET /api/progress
自分の全クエスト進捗を返す。

**権限:** 全ロール（自分の分のみ）

**レスポンス 200:**
```json
[
  {
    "questId": "quest_abc123",
    "taskStates": [
      { "taskId": "t1", "completed": true, "count": 8 },
      { "taskId": "t2", "completed": false, "count": 0 },
      { "taskId": "t3", "completed": false, "count": 0 }
    ],
    "completed": false,
    "rewardClaimed": false,
    "startedAt": "2026-06-12T10:00:00Z",
    "completedAt": null
  }
]
```

---

### GET /api/progress/:questId
特定クエストの進捗を返す。

**権限:** 全ロール（自分の分のみ）

**レスポンス 200:** `GET /api/progress` の1要素と同形式

**エラー:**
- `404` 進捗レコードなし（未開始）

---

### POST /api/progress/:questId/claim
報酬を受け取る。

**権限:** 全ロール

**前提条件:** クエスト完了済み (`completed=true`) かつ未受取 (`rewardClaimed=false`)

**レスポンス 200:**
```json
{ "claimed": true }
```

**エラー:**
- `400` クエスト未完了、または受取済み
- `404` 進捗レコードなし

---

## 提案 API

提案は「編集権限を持たないプレイヤーがクエストの追加・変更を申請する」機能。
承認されると実際のクエスト JSON として書き出される。

### GET /api/proposals
提案一覧を返す。

**権限:** 全ロール

**クエリパラメータ:**

| パラメータ | 型 | デフォルト | 説明 |
|-----------|---|----------|------|
| `status` | `pending\|approved\|rejected` | `pending` | フィルタ |
| `sort` | `newest\|votes` | `newest` | ソート順 |

**レスポンス 200:**
```json
[
  {
    "id": 1,
    "proposerName": "Alex",
    "status": "pending",
    "questSnapshot": {
      "title": "ネザーへの挑戦",
      "icon": "netherrack",
      "tasks": [...],
      "rewards": [...]
    },
    "votesUp": 5,
    "votesDown": 1,
    "myVote": "up",
    "rejectReason": null,
    "createdAt": "2026-06-12T10:00:00Z"
  }
]
```

`myVote` は未投票なら `null`。

---

### POST /api/proposals
クエスト提案を投稿する。

**権限:** 全ロール（`player` 含む）

**リクエスト:**
```json
{
  "questSnapshot": {
    "title": "ネザーへの挑戦",
    "subtitle": "灼熱の世界で生き残れ",
    "description": "ネザーに行って帰ってくる。",
    "icon": "netherrack",
    "tags": ["中盤", "冒険"],
    "tasks": [...],
    "rewards": [...],
    "prerequisites": ["quest_abc123"]
  }
}
```

`questSnapshot` はクエスト JSON から `id` / `status` / `creatorUuid` / タイムスタンプを除いたもの。
マップ上の座標は含まない（承認後にエディタで配置する）。

**レスポンス 201:** 作成された提案全体

---

### POST /api/proposals/:id/vote
提案に投票する。同じ方向に再投票すると取り消し、反対方向で上書きする。

**権限:** 全ロール

**リクエスト:**
```json
{ "type": "up" }
```

**レスポンス 200:**
```json
{ "votesUp": 6, "votesDown": 1, "myVote": "up" }
```

**エラー:**
- `404` 提案が存在しない
- `400` 承認・却下済みの提案には投票不可

---

### POST /api/proposals/:id/approve
提案を承認してクエスト JSON として書き出す。

**権限:** `editor`, `admin`

**リクエスト:** (body なし、または上書きしたい差分フィールドを指定可)
```json
{
  "mapPosition": { "x": 600, "y": 200 }
}
```

処理:
1. `questSnapshot` をベースにクエスト JSON を生成
2. `id` を新規採番、`status=public`、`creatorUuid` を提案者の UUID に設定
3. `mapPosition` が指定されていればマップファイルにも追記
4. `proposals.status` を `approved` に更新

**レスポンス 200:**
```json
{ "questId": "quest_xyz999" }
```

---

### POST /api/proposals/:id/reject
提案を却下する。

**権限:** `editor`, `admin`

**リクエスト:**
```json
{ "reason": "前提条件の設定が不適切です。" }
```

**レスポンス 200:**
```json
{ "status": "rejected" }
```

---

## 報酬テーブル API

### GET /api/reward-tables
報酬テーブル一覧を返す。

**権限:** 全ロール

**レスポンス 200:**
```json
[
  { "id": "table_lv", "name": "LV 報酬", "rewardCount": 3 }
]
```

---

### GET /api/reward-tables/:id
報酬テーブルの詳細（報酬内容）を返す。

**権限:** 全ロール

---

### POST /api/reward-tables
報酬テーブルを新規作成する。

**権限:** `editor`, `admin`

---

### PUT /api/reward-tables/:id
報酬テーブルを更新する。

**権限:** `editor`, `admin`

---

### DELETE /api/reward-tables/:id
報酬テーブルを削除する。参照中のクエストがある場合は `409 Conflict`。

**権限:** `admin`

---

## エラーコード一覧

| コード | 意味 |
|--------|------|
| `400` | リクエストが不正 |
| `401` | 未認証 (トークンなし/無効/期限切れ) |
| `403` | 権限不足 |
| `404` | リソースが存在しない |
| `409` | 競合 (削除不可など) |
| `500` | サーバー内部エラー |

---

## Mock サーバーとの対応

Mock サーバー (`web/mock-server/`) は上記 API 契約を SQLite + Drizzle で実装する。
ファイルベース部分（クエスト JSON・マップ JSON）は Mock では SQLite テーブルで代替し、
API レスポンス形式は本番プラグインと完全に一致させる。

| 本番 (プラグイン) | Mock サーバー |
|-----------------|-------------|
| `quests/*.json` | `quests` テーブル |
| `maps/default.json` | `map_nodes` + `map_edges` テーブル |
| `reward_tables/*.json` | `reward_tables` テーブル |
| SQLite (進捗・セッション) | SQLite (同じスキーマ) |
