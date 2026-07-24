# pre-release-checker

自社の特定 Web サービス（ステージング環境）を対象にした品質保証自動化ツールです。

## 技術スタック

- Node.js 22 / TypeScript
- React + Vite + Tailwind CSS（ダッシュボード）
- Express（API）
- Playwright（E2E エンジン）
- BullMQ + Redis（ジョブキュー・定期実行）
- Prisma + SQLite（MVP-1、後から PostgreSQL 移行可能）

## セットアップ

```bash
# 依存インストール
npm install

# Redis 起動
docker compose up -d

# 環境変数コピー
cp .env.example .env
# .env を編集

# DB 生成・マイグレーション
npm run db:generate
npm run db:migrate

# 開発サーバー起動（API + Runner + Web）
npm run dev
```

ダッシュボード: http://localhost:5173  
API: http://localhost:3001

## スクリプト

| スクリプト | 説明 |
|---|---|
| `npm run dev` | API・Runner・Web を並列起動 |
| `npm run build` | 全ワークスペースをビルド |
| `npm run typecheck` | 全ワークスペースで型検査 |
| `npm run test` | 全ワークスペースでテスト実行 |
| `npm run db:studio` | Prisma Studio を起動 |

## 注意事項

- テスト対象は `ALLOWED_STAGING_ORIGINS` で許可したオリジンのみです。
- MVP-1 のクローラーは `GET` 遷移のみを行い、破壊的な書き込みは行いません。
- 認証情報は `APP_MASTER_KEY` を用いて暗号化して保存します（MVP-4 実装）。
