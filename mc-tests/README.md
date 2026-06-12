# mc-tests — Minecraft E2E テスト

Mineflayer でサーバーに接続し、プラグインの挙動を実際のクライアントから検証する。

## 前提条件

1. `run/` 配下の Minecraft サーバーが起動済み
2. `AdvancementQuesting.jar` がロード済み (`run/plugins/AdvancementQuesting.jar`)
3. `online-mode=false` (`run/server.properties`)
4. Node.js 18+ (fetch 内蔵)

## セットアップ

```bash
cd mc-tests
npm install
```

## 実行

```bash
npm test
```

## 環境変数

| 変数 | デフォルト | 説明 |
|------|---------|-----|
| `MC_HOST` | `localhost` | Minecraft サーバーホスト |
| `MC_PORT` | `25565` | Minecraft サーバーポート |
| `API_BASE` | `http://localhost:8080` | プラグインの HTTP API ベース URL |

```bash
MC_PORT=25565 API_BASE=http://localhost:8080 npm test
```

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
