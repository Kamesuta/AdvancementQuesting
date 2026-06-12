# 提案機能 UI 設計書

## 概要

クエスト提案機能を既存のマップエディタUIに統合する。  
ロール (`player` / `editor` / `admin`) に応じてUIを動的に切り替え、
提案の作成・閲覧・投票・承認をすべて1画面で完結させる。

---

## ロール定義の変更

現在 `PlayerSession` に `role` フィールドがないため追加する。

```ts
// src/types/auth.ts
interface PlayerSession {
  playerUuid: string
  playerName: string
  role: 'player' | 'editor' | 'admin'
}
```

モックサーバーの `GET /api/auth/me` も `role` を返すよう修正する。  
`playerSessions` テーブルに `role` カラムを追加し、seed でそれぞれのロールを持つデモセッションを用意する。

---

## テスト用ログイン (Login.tsx)

開発環境で素早くロール切り替えできるよう、ログイン画面に2つのクイックログインボタンを追加する。

```
┌────────────────────────────────┐
│  6桁コード入力フォーム (既存)   │
│                                │
│  ─── 開発用クイックログイン ─── │
│  [編集者としてログイン]          │
│  [プレイヤーとしてログイン]      │
└────────────────────────────────┘
```

それぞれのボタンはローカル固定トークンを使い、`/api/auth/me` を叩かずに直接 localStorage に保存してリダイレクトする。

| ボタン | トークン | role |
|--------|---------|------|
| 編集者 | `demo-editor-token` | `editor` |
| プレイヤー | `demo-player-token` | `player` |

seed.ts でそれぞれのトークンを事前登録しておく。

---

## ツールバー再設計

### ToolMode の変更

`edit_quest` モードを廃止し、`select` モードがクリック時にモーダルを開く動作を担う。  
`move` モードを新設してノード位置変更専用とする。

```ts
type ToolMode = 'select' | 'move' | 'add_node' | 'add_link' | 'delete'
//                          ↑新設: ノードドラッグで位置変更
```

| ボタン | アイコン | 動作 | 背景ドラッグ |
|--------|---------|------|------------|
| 選択 (矢印) | `MousePointer2` | ノードクリックでモーダル | パン |
| 移動 (十字矢印) | `Move` | ノードドラッグで位置変更 | パン |
| 追加 | `Plus` | キャンバスクリックでクエスト追加 | パン |
| 依存関係 | `ArrowRight` | ノード→ノードで依存線を引く | パン |
| 削除 | `Trash2` | ノードクリックで削除 | パン |

**背景ドラッグは全モードでパン** (現状維持)。  
鉛筆 (`Edit3`) ボタンは廃止。`select` モードがその役割を担う。

### ロールによるボタン表示制御

| ボタン | player (通常) | player (提案モード) | editor / admin |
|--------|-------------|-------------------|----------------|
| 選択 | ✅ | ✅ | ✅ |
| 移動 | ❌ | ✅ (提案ドラフトのみ移動可) | ✅ (全ノード移動可) |
| 追加 | ❌ | ✅ | ✅ |
| 依存関係 | ❌ | ✅ | ✅ |
| 削除 | ❌ | ✅ (提案ドラフトのみ) | ✅ |
| 報酬テーブル | ❌ | ❌ | ✅ |
| 設定 | ❌ | ❌ | ✅ |

---

## 提案モード (player のみ)

### 右上ボタンの状態遷移

```
通常時:
  [👋 クエスト追加を提案する]  ← ナビバー右端の保存ボタンを置き換え

↓ ボタンクリック → 提案モード ON

提案モード:
  [📤 提案を送信する]  [✕ キャンセル]
```

### 提案モードの挙動

1. **ON になったとき**  
   - ツールバーに追加・依存関係・削除ボタンが出現  
   - キャンバスに他の pending 提案が半透明 (`opacity-50`) で表示される  
   - 各提案ノードに 👍 数バッジを表示  
   - 自分が今回追加するノード/エッジは通常表示 (proposalNodes / proposalEdges として別state管理)

2. **提案ノードの操作**  
   - 追加・移動・削除は通常ノードと同じ操作感だが、`proposalNodes` state にのみ書き込む  
   - 既存の公開クエストは移動・削除不可 (クリックすると提案先の前提クエスト設定になる)

3. **「提案を送信する」クリック**  
   - `proposalNodes` が空なら「追加するクエストがありません」エラー  
   - `POST /api/proposals` を各 proposalNode 分呼び出す  
   - 成功したら提案モードを OFF にし、トースト「提案を送信しました」を表示

4. **キャンセル**  
   - `proposalNodes` / `proposalEdges` を破棄して提案モード OFF

### 他者の提案表示

`GET /api/proposals?status=pending` で取得した提案を、  
マップ上の提案ノードとして半透明レイヤーに重ねる。

```
提案ノードの見た目:
  - 透明度 50%
  - 枠: 黄色の点線 ring
  - バッジ: 👍 N (votes_up の数)
```

player がこのノードをクリックしても提案のいいね投票ができる (モーダルなし、クリックで +1)。

---

## 承認フロー (editor / admin のみ)

提案ノードをクリックすると通常のクエスト編集モーダルが開くが、  
ヘッダーに承認/却下ボタンが追加される。

```
┌────────────────────────────────────────────────┐
│  📋 提案を確認 (by Alex)  👍5  👎1             │
│  [承認して公開] [却下]               [✕ 閉じる] │
│  ─────────────────────────────────────────────  │
│  (通常のクエスト編集フォーム)                     │
└────────────────────────────────────────────────┘
```

- **承認**: `POST /api/proposals/:id/approve` → status が `public` に変わり、通常ノードとして表示
- **却下**: 却下理由入力欄 → `POST /api/proposals/:id/reject`

---

## API 変更点

### `GET /api/proposals` のレスポンス拡張

現在のレスポンスに `mapPosition` を追加する (提案時にも座標を保存)。

```json
{
  "id": 1,
  "questId": "uuid...",
  "questSnapshot": { ... },
  "mapPosition": { "x": 300, "y": 200 },
  "proposerName": "Alex",
  "votesUp": 5,
  "votesDown": 1,
  "myVote": "up",
  "status": "pending"
}
```

### `POST /api/proposals` のリクエスト変更

```json
{
  "questSnapshot": { ... },
  "mapPosition": { "x": 300, "y": 200 }
}
```

現在のモックは `questSnapshot` なしでクエストを直接生成しているが、  
api-design.md に合わせて `questSnapshot` パターンに移行する。

### `GET /api/auth/me` に `role` を追加

```json
{
  "playerUuid": "...",
  "playerName": "Steve",
  "role": "player"
}
```

---

## 実装順序

### Step 1: 基盤 (認証 + ロール)
- `playerSessions` テーブルに `role` カラム追加 + migration
- `GET /api/auth/me` で `role` を返す
- `PlayerSession` 型に `role` 追加
- seed.ts: editor / player それぞれのデモトークン追加
- `Login.tsx`: クイックログインボタン追加
- `App.tsx`: `me.role` をコンテキストで配布

### Step 2: ツールバー再設計
- `ToolMode` に `pan` を追加、`edit_quest` を廃止
- `select` モードでクリック → モーダルを開く
- `pan` モードで背景ドラッグのみ
- ロールに応じてボタンを表示制御
- ナビバーの「保存」をロール別に切り替え

### Step 3: 提案モード UI
- `proposalNodes` / `proposalEdges` state 追加
- 提案モード ON/OFF のフラグと切り替えボタン
- 他者の pending 提案を半透明ノードで描画
- 提案ノードのクリックでいいね投票 (player)

### Step 4: 提案の送信・承認
- 「提案を送信する」→ `POST /api/proposals` (mapPosition 付き)
- モック: proposals API を questSnapshot パターンに移行
- 承認フロー: 提案ノードクリックで編集モーダル + 承認/却下ボタン
- `POST /api/proposals/:id/approve` → マップに通常ノード追加

---

## データフロー図

```
player の操作:
  提案モード ON
    → proposalNodes に追加 (ローカルのみ)
    → 「提案を送信」
    → POST /api/proposals (questSnapshot + mapPosition)
    → 送信完了 → proposalNodes クリア

editor の操作:
  GET /api/proposals → 提案ノードを半透明表示
  提案ノードクリック → 編集モーダル + 承認ボタン
  承認 → POST /api/proposals/:id/approve
       → クエスト status が public に
       → GET /api/quests で通常ノードとして表示
```

---

## 未解決事項

- 提案ノードの座標: 承認後に editor がマップ上に配置するか、提案時の座標を使うか
  → 提案時の座標を初期値として使い、承認後に editor が動かせる形にする
- 提案の前提クエスト設定: 既存ノードをクリックして設定する UX は提案モードでも有効にする
- 提案モードでの依存関係エッジ: 既存クエストへの依存は `prerequisites` に ID を入れるだけでよい
