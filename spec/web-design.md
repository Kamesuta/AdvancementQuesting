# Web システム設計書

## アーキテクチャ概要

```
┌─────────────────────────────────────────────────────┐
│                   ブラウザ (SPA)                     │
│          React + TypeScript + Vite                  │
└──────────────────────┬──────────────────────────────┘
                       │ REST API (JSON)
           ┌───────────┴───────────┐
           │                       │
  ┌────────▼────────┐    ┌─────────▼────────┐
  │   Mock Server   │    │  Minecraft Plugin │
  │ Express + SQLite│    │   (Paper / Java)  │
  │   (開発・テスト) │    │   (本番環境)       │
  └─────────────────┘    └──────────────────┘
```

### 本番構成

- ビルド済み静的ファイル (`dist/`) をプラグインの組み込み HTTP サーバーから配信
- API もプラグイン内で実装 — 追加サーバー不要、プラグイン 1 本で完結

### 開発構成

- フロントエンド: Vite dev server (`localhost:5173`)
- API: Mock サーバー (`localhost:3000`)
- Vite proxy で `/api/*` を Mock サーバーへ転送

---

## ディレクトリ構成

```
AdvancementQuesting/
├── src/                        # Java プラグイン本体
├── spec/                       # 設計書類
└── web/                        # Web 系コード
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    │
    ├── src/                    # フロントエンド
    │   ├── main.tsx
    │   ├── App.tsx             # Nav + ルーティング
    │   │
    │   ├── hooks/
    │   │   └── useIsMobile.ts  # 640px 未満で true
    │   │
    │   ├── types/              # API レスポンス型定義
    │   │   ├── quest.ts        # Quest, Task, Reward など
    │   │   ├── progress.ts     # PlayerProgress
    │   │   ├── proposal.ts     # Proposal, VoteRequest
    │   │   └── auth.ts         # Session, Role
    │   │
    │   ├── api/                # API クライアント
    │   │   ├── client.ts       # fetch wrapper / ベース URL 切替
    │   │   ├── quests.ts
    │   │   ├── map.ts          # GET/PUT /api/map
    │   │   ├── progress.ts
    │   │   ├── proposals.ts
    │   │   ├── rewardTables.ts
    │   │   └── auth.ts
    │   │
    │   ├── pages/
    │   │   ├── Editor.tsx      # クエストマップエディタ (メイン画面)
    │   │   ├── Login.tsx       # 6桁コード入力
    │   │   ├── Proposals.tsx   # 提案一覧・投票 (TODO)
    │   │   ├── Progress.tsx    # 自分の進捗 (TODO)
    │   │   └── QuestDetail.tsx # クエスト詳細 (TODO)
    │   │
    │   └── components/
    │       └── editor/
    │           ├── types.ts        # エディタ内部型 (EditorNode, EditorEdge...)
    │           ├── constants.ts    # ITEM_TYPES, TASK_TYPES, REWARD_TYPES
    │           ├── ItemIcon.tsx    # Minecraft 風 SVG アイコン
    │           ├── ToolButton.tsx  # Minecraft ベベルスタイルボタン
    │           ├── EdgePattern.tsx # 依存関係の矢印 SVG
    │           ├── utils.ts        # getDisplayText など
    │           └── modals/
    │               ├── QuestEditorModal.tsx      # クエスト詳細編集
    │               ├── TaskRewardEditorModal.tsx # タスク/報酬個別編集
    │               ├── ItemSelectorModal.tsx     # アイテム選択グリッド
    │               └── RewardTableModal.tsx      # 報酬テーブル一覧
    │
    └── mock-server/            # 開発用モックサーバー
        ├── index.ts
        ├── middleware/
        │   └── auth.ts         # Bearer トークン検証
        ├── db/
        │   ├── schema.ts       # Drizzle スキーマ
        │   ├── client.ts
        │   ├── migrate.ts
        │   └── seed.ts
        └── routes/
            ├── auth.ts
            ├── quests.ts
            ├── map.ts          # TODO: GET/PUT /api/map
            ├── progress.ts
            ├── proposals.ts
            └── rewardTables.ts # TODO
```

---

## 技術スタック

### フロントエンド

| 用途 | ライブラリ |
|------|-----------|
| フレームワーク | React 19 + TypeScript |
| ビルドツール | Vite |
| スタイリング | TailwindCSS v4 |
| ルーティング | React Router v7 |
| サーバー状態 | TanStack Query |

### Mock サーバー

| 用途 | ライブラリ |
|------|-----------|
| サーバー | Express 5 + TypeScript |
| ORM | Drizzle ORM |
| DB | SQLite (`better-sqlite3`) |
| 実行 | tsx |

---

## エディタ型と API 型の関係

エディタは描画用の内部型 (`editor/types.ts`) を持つ。保存時に API 型へ変換する。

```
EditorNode   ──► Quest JSON  (タイトル・タスク・報酬など)
             ──► MapNode     (x, y 座標)  → PUT /api/map
EditorEdge   ──► MapEdge     → PUT /api/map
EditorTask   ──► Quest.tasks[]
EditorReward ──► Quest.rewards[]
```

| エディタ型フィールド | API フィールド | 備考 |
|-------------------|-------------|------|
| `EditorNode.id` | `Quest.id` / `MapNode.questId` | 共通 ID |
| `EditorNode.{x,y}` | `MapNode.{x,y}` | マップファイルへ分離 |
| `EditorNode.icon` | `Quest.icon` | そのまま |
| `EditorTask.type` | `Quest.tasks[].type` | `item`/`advancement`/`checkmark`/`command` |
| `EditorTask.itemType` | `Quest.tasks[].itemType` | `type==='item'` のみ |
| `EditorEdge` | `MapEdge` | マップファイルへ |

---

## 認証フロー

```
[Minecraft]              [ブラウザ]             [Mock / Plugin]
    │                        │                        │
    │  /quest code           │                        │
    │ ──────────────────────────────────────────────► │ 6桁コード生成・DB保存
    │                        │                        │ (role も同時に決定)
    │                        │                        │
    │  コード入力             │                        │
    │ ──────────────────────►│                        │
    │                        │  POST /api/auth/code   │
    │                        │ ──────────────────────►│
    │                        │                        │ コード検証
    │                        │  { token, role, ... }  │
    │                        │ ◄──────────────────────│
    │                        │ localStorage に保存     │
    │                        │                        │
    │                        │  以降: Authorization: Bearer <token>
```

`role` は `player` / `editor` / `admin` の 3 段階。
フロントエンドはロールに応じてエディタへのアクセスを制御する。

---

## Vite proxy 設定

```ts
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
```

---

## Mock サーバー: DB とファイルの対応

本番はクエストを JSON ファイルで管理するが、Mock では開発効率のため SQLite テーブルで代替する。
API レスポンス形式は完全に一致させる。

| 本番 (プラグイン) | Mock DB テーブル |
|-----------------|----------------|
| `quests/*.json` | `quests` |
| `maps/default.json` (nodes) | `map_nodes` (TODO) |
| `maps/default.json` (edges) | `map_edges` (TODO) |
| `reward_tables/*.json` | `reward_tables` (TODO) |
| SQLite: `player_progress` | `player_progress` |
| SQLite: `player_sessions` | `player_sessions` |
| SQLite: `auth_codes` | `auth_codes` |
| SQLite: `proposals` | `proposals` |
| SQLite: `proposal_votes` | `proposal_votes` |

---

## npm スクリプト

```json
{
  "scripts": {
    "dev": "concurrently \"npm run mock\" \"vite\"",
    "mock": "tsx watch mock-server/index.ts",
    "mock:seed": "tsx mock-server/db/seed.ts",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate"
  }
}
```

`npm run dev` 一発でフロントエンドとモックサーバーが同時起動。

---

## 環境変数

```bash
# web/.env.example

# Mock サーバーポート
MOCK_PORT=3000

# DB ファイルパス
DB_PATH=./mock-server/db/quest.db
```

フロントエンドから API へのアクセスは Vite proxy 経由のため、フロントに API URL の env は不要。

---

## 開発フェーズ

### Phase W1 ✅ 基盤セットアップ
- [x] Vite + React + Tailwind + Drizzle + Express Mock
- [x] 認証フロー（コード認証・トークン管理・`/api/auth/me`）

### Phase W2 ✅ クエストマップエディタ
- [x] マップベースエディタ（ノード追加・移動・削除・依存関係）
- [x] タスク・報酬編集モーダル（タスク種別・報酬種別）
- [x] アイテムアイコン選択（Minecraft 風グリッド）
- [x] Minecraft 風 UI（ベベルボーダー・Courier フォント・グレーパネル）
- [x] PC・スマホ対応（タッチパン・タッチドラッグ・スワイプ接続）
- [x] スマホ全画面モーダル（`useIsMobile` フック）
- [x] モード切替トースト

### Phase W3 提案システム
- [ ] 提案投稿 UI（エディタと同じ画面、`POST /api/proposals` へ保存）
- [ ] 提案一覧・投票 UI（`Proposals.tsx`）
- [ ] 管理者承認/却下 UI
- [ ] Mock API: `map_nodes` / `map_edges` テーブル追加、`PUT /api/map` 実装

### Phase W4 プレイヤー向け画面
- [ ] クエストマップ閲覧（進捗状態のカラーリング）
- [ ] クエスト詳細・進捗確認画面
- [ ] 報酬受取フロー（`POST /api/progress/:id/claim`）
- [ ] 報酬テーブル CRUD UI

### Phase W5 Minecraft プラグイン連携
- [ ] プラグイン側 REST API（Mock と同じ契約）
- [ ] クエスト JSON ファイルの読み書き
- [ ] Advancement 連携・進捗トラッキング
- [ ] 床面マップ表示・チェスト GUI
- [ ] 通知システム（タイトル・アクションバー・チャット）
