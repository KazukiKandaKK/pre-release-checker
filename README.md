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

## Docker（本番・社内サーバー用）

```bash
# .env に APP_MASTER_KEY と ALLOWED_STAGING_ORIGINS を設定
cp .env.example .env
# 64文字Hex のマスターキーに変更

# すべてのサービスをビルド＆起動
docker compose up --build -d

# ダッシュボード: http://localhost
# API: http://localhost:3001
```

- `data/` ボリュームに SQLite とスクリーンショットが永続化されます。
- `migrate` サービスが起動時に `prisma migrate deploy` を自動実行します。
- Playwright ブラウザを含んだ公式イメージを使用しているため、別途ブラウザのダウンロードは不要です。

## 機能

- **クロール**: 対象 URL から同一オリジンを BFS クロールし、各ページのスクリーンショット・HTTP エラー・JS コンソールログを収集します。
- **シナリオ自動生成**: クロール中に検出したフォームから、正常系の入力→送信フローを自動生成します。
- **異常系シナリオ自動生成**: 空値、最大長超過、特殊文字（SQL/HTML/絵文字など）、フォーマット違反の入力、二重送信、戻る操作などの異常系パターンを自動生成します。
- **シナリオ実行**: 自動生成または手動作成したシナリオを E2E 実行し、ステップごとのスクリーンショットとログをレポートします。
- **認証対応**: Cookie、Basic 認証、OAuth トークン、フォーム認証（ID/PW）の認証情報を AES-256-GCM で暗号化して保存し、クロール・シナリオ実行時に適用します。
- **定期実行スケジューラ**: ダッシュボードで Cron 式を設定し、クロールまたは全シナリオの定期実行を行います。
- **ガードレール**: `ALLOWED_STAGING_ORIGINS` と除外パターンにより、本番接続・破壊的操作を防止します。除外パターンはワイルドカード `*` `?` に対応します。
- **ビジュアル差分**: 前回のクロールと同じ URL のスクリーンショットを `pixelmatch` で比較し、設定した閾値以上の差分を検出します。
- **重要度分類**: HTTP エラー、JS エラー、シナリオ失敗、視覚的差分を `Critical / High / Medium / Low` で分類します。
- **新規・既知の判定**: 前回実行との Finding 比較で、新規に発生した問題か既知の問題かをマークします。
- **メール通知**: SMTP 設定を有効化すると、クロール・シナリオ実行後に Findings のサマリーをメール送信します。

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
- クローラーは `GET` 遷移のみを行い、破壊的な書き込みは行いません。
- フォーム送信など副作用を伴うシナリオは、ステージング環境でも慎重に運用してください。
- 認証情報は `APP_MASTER_KEY` を用いて暗号化して保存します（MVP-4 実装）。
