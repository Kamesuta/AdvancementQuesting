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
セッションを削除する（ハード削除）。

**権限:** 全ロール

**レスポンス 204:** (body なし)

> **実装注意:** ソフトデリート（`expiresAt=0`）ではなく物理削除すること。
> 同じトークンで再ログインする場合は `/api/auth/quick` の upsert を使う。

---

### POST /api/auth/quick ⚠️ Mock 専用・本番非対応
固定の開発用トークンでセッションを即座に upsert する。

**権限:** 不要

**リクエスト:**
```json
{ "token": "demo-editor-token" }
```

**対応トークン:**
| トークン | プレイヤー | ロール |
|--------|---------|------|
| `demo-session-token-for-development` | Steve | editor |
| `demo-editor-token` | Editor | editor |
| `demo-player-token` | Alex | player |

**レスポンス 200:**
```json
{
  "token": "demo-editor-token",
  "playerUuid": "bbbbbbbb-...",
  "playerName": "Editor",
  "role": "editor"
}
```

**エラー:**
- `400` 未知のトークン

---

## クエスト API

### GET /api/quests
クエスト一覧を返す。マップ座標も含む。

**権限:** 認証不要（未ログインでも閲覧可）

**クエリパラメータ:**

| パラメータ | 型 | デフォルト | 説明 |
|-----------|---|----------|------|
| `status` | `public\|draft\|hidden\|proposed` | - | フィルタ（未指定で全件） |
| `category` | string | - | カテゴリで絞り込み |

**レスポンス 200:**
```json
[
  {
    "id": "00000000-0000-0000-0000-000000000001",
    "title": "基本",
    "description": "クエストの説明",
    "icon": "oak_log",
    "category": null,
    "prerequisites": [],
    "conditions": [...],
    "rewards": [...],
    "mapPosition": { "x": 200, "y": 150 },
    "customButtons": [],
    "status": "public",
    "creatorUuid": null,
    "createdAt": "2026-06-12T00:00:00.000Z",
    "updatedAt": "2026-06-12T00:00:00.000Z"
  }
]
```

> **Mock の挙動:** 認証不要で全 status のクエストを返す。
> 本番ではロールに応じてフィルタを行う（`player` は `public` のみ、`editor` 以上は全件）。

---

### GET /api/quests/:id
クエスト詳細を返す。

**権限:** 認証不要

**レスポンス 200:** `GET /api/quests` の1要素と同形式

**エラー:**
- `404` 存在しない

---

### POST /api/quests
クエストを新規作成する。

**権限:** `editor`, `admin`

**リクエスト:** クエスト JSON (`id` / `createdAt` / `updatedAt` を除く全フィールド)

**レスポンス 201:** 作成されたクエスト全体

---

### PUT /api/quests/:id
クエストを更新する（部分更新可）。

**権限:** `editor`, `admin`

**リクエスト:** 更新したいフィールドのみ

**レスポンス 200:** 更新後のクエスト全体

---

### DELETE /api/quests/:id
クエストを削除する。

**権限:** `admin`（Mock は `editor` でも可）

**レスポンス 204:** (body なし)

---

## プレイヤー進捗 API

### GET /api/progress
自分の全クエスト進捗を返す。

**権限:** 全ロール（自分の分のみ）

**レスポンス 200:**
```json
[
  {
    "id": 1,
    "playerUuid": "550e8400-...",
    "questId": "00000000-0000-0000-0000-000000000001",
    "progress": [...],
    "completed": false,
    "rewardClaimed": false,
    "startedAt": "2026-06-12T10:00:00.000Z",
    "completedAt": null
  }
]
```

---

### GET /api/progress/:questId
特定クエストの進捗を返す。

**権限:** 全ロール（自分の分のみ）

**エラー:**
- `404` 進捗レコードなし（未開始）

---

### POST /api/progress/:questId/claim
報酬を受け取る。（将来実装）

**権限:** 全ロール

---

## 提案 API

### GET /api/proposals
提案一覧を返す。クエスト情報と投票状態を付加する。

**権限:** 全ロール

**レスポンス 200:**
```json
[
  {
    "id": 1,
    "questId": "uuid-of-proposed-quest",
    "proposerUuid": "cccccccc-...",
    "proposerName": "Alex",
    "status": "pending",
    "votesUp": 2,
    "votesDown": 0,
    "rejectReason": null,
    "createdAt": "2026-06-12T10:00:00.000Z",
    "myVote": "up",
    "mapPosition": { "x": 300, "y": 200 },
    "questSnapshot": {
      "title": "ネザーへの挑戦",
      "description": "灼熱の世界で生き残れ",
      "icon": "netherrack",
      "prerequisites": []
    }
  }
]
```

`myVote` は未投票なら `null`。
`mapPosition` と `questSnapshot` は `quests` テーブルから JOIN して付加する。

---

### POST /api/proposals
クエスト提案を投稿する。

**権限:** 全ロール（`player` 含む）

**リクエスト:**
```json
{
  "title": "ネザーへの挑戦",
  "description": "灼熱の世界で生き残れ",
  "icon": "netherrack",
  "prerequisites": ["00000000-0000-0000-0000-000000000001"],
  "mapPosition": { "x": 300, "y": 200 }
}
```

処理:
1. `quests` テーブルに `status='proposed'` でクエストを作成
2. `quest_proposals` に提案レコードを作成（`questId` で参照）

**レスポンス 201:** 作成された提案全体（`myVote: null`）

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
{ "myVote": "up" }
```

**エラー:**
- `404` 提案が存在しない

---

### POST /api/proposals/:id/approve
提案を承認してクエストを `public` に変更する。

**権限:** `editor`, `admin`

処理:
1. `quest_proposals.status` を `approved` に更新
2. 対応する `quests.status` を `public` に変更

**レスポンス 200:**
```json
{ "status": "approved" }
```

---

### POST /api/proposals/:id/reject
提案を却下する。

**権限:** `editor`, `admin`

**リクエスト:**
```json
{ "reason": "前提条件の設定が不適切です。" }
```

処理:
1. `quest_proposals.status` を `rejected`、`rejectReason` を設定
2. 対応する `quests.status` を `hidden` に変更

**レスポンス 200:**
```json
{ "status": "rejected" }
```

---

## テスト用 API ⚠️ Mock 専用・本番非対応

### POST /api/test/restore-sessions
デモセッションを復元する（有効期限を7日延長する upsert）。

### POST /api/test/restore-auth-code
コード `123456` を未使用状態でリセットする（有効期限を5分延長）。

### POST /api/test/reset-proposals
全提案・提案投票・`status='proposed'` のクエストを削除する。

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
本番プラグインとのスキーマ差異は以下の通り:

| 概念 | 本番 (プラグイン) | Mock サーバー |
|------|----------------|-------------|
| クエスト定義 | `quests/*.json` | `quests` テーブル（`mapPosition` を含む） |
| マップ座標 | `maps/default.json` | クエストの `map_position` カラムに統合 |
| 進捗・セッション | SQLite | SQLite（同じスキーマ） |
| 提案・投票 | SQLite | SQLite（同じスキーマ） |
| 報酬テーブル | `reward_tables/*.json` | 未実装 |
