# pre-release-checker 全体設計・MVP-1 実装計画

## 1. 技術スタック（最終提案）

| 領域 | 採用技術 | 選定理由 |
|---|---|---|
| 言語・ランタイム | Node.js 22 + TypeScript（strict） | フロント/バック/テストランナーを同一言語で書け、Playwright 公式 SDK も第一級 |
| パッケージ管理 | npm workspaces | 既存 `rss-sec-check` リポジトリと運用方針を合わせられる |
| フロントエンド | React 18 + Vite + TypeScript + Tailwind CSS | 構築・型検査・ビルドが軽量。既存 React プロジェクトと一致 |
| バックエンド API | Express + Zod | 軽量。リクエスト検証を型安全に行う |
| E2E エンジン | Playwright（Chromium 中心） | コンソールログ・ネットワーク傍受・スクリーンショット・PDF 出力が標準機能 |
| ジョブキュー | BullMQ + Redis | 並列実行・再試行・遅延実行・repeatable ジョブ（定期実行）を同一ライブラリで賄う |
| DB | Prisma ORM + SQLite（MVP-1） | スキーマ駆動で後から PostgreSQL へ移行しやすい。MVP-1 は環境構築なしで動作させる |
| バイナリ保存 | ローカルファイルシステム（MVP-1） | オブジェクトストレージインターフェースを先に切り、後から MinIO/S3 へ差し替え |
| 暗号化 | libsodium-wrappers (`crypto_secretbox`) | 認証情報をマスターキーで暗号化 |
| 通知 | 通知抽象レイヤー（インターフェース） | MVP-1 ではログ/DB のみ。MVP-5 でメール実装を差し込む |

### 基盤制約・安全設計
- **ステージング限定**: `ALLOWED_STAGING_ORIGINS` 環境変数にホワイトリスト登録したオリジンのみを対象とする。未登録 URL は設定・クロール共に拒否。
- **破壊的操作のガード**: MVP-1 のクローラーは `GET` のみ追跡。フォーム送信・クリックによる書き込みは MVP-2 以降、除外リスト・確認ダイアログを経て実装。
- **除外リスト**: 正規表現または glob で `logout`/`delete-account`/`checkout/confirm` などを指定可能。
- **レート制限**: 同一ホストあたりの並列タブ数・リクエスト間隔を設定可能（BullMQ concurrency + ページ遷移 delay）。
- **認証情報**: マスターキー（`APP_MASTER_KEY`）による暗号化。平文保存禁止。

## 2. リポジトリ構成案

```
pre-release-checker/
├── README.md
├── .env.example
├── docker-compose.yml          # Redis（+ 将来的な Postgres / MinIO 用）
├── package.json                # npm workspaces, scripts, engines
├── tsconfig.base.json
├── apps/
│   ├── web/                    # React ダッシュボード SPA
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── api/            # fetch ラッパー
│   │   │   ├── pages/          # Top, Runs, RunDetail, Settings
│   │   │   └── components/     # URLInput, RunList, PageList, ScreenshotViewer
│   ├── api/                    # Express REST API
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts        # サーバー起動
│   │   │   ├── routes/         # jobs, runs, settings
│   │   │   ├── services/       # config, queue producer
│   │   │   └── middleware/     # errorHandler, validate
│   └── runner/                 # BullMQ Worker + Playwright ランナー
│       ├── package.json
│       ├── src/
│       │   ├── worker.ts       # BullMQ worker 起動
│       │   ├── crawler.ts      # クロール・スクリーンショット・ログ収集
│       │   ├── guards.ts       # URL 検証・除外リスト・ドメインガード
│       │   └── reporters/      # 結果の DB/ストレージ書き込み
├── packages/
│   ├── shared/                 # 型・Zod スキーマ・定数
│   │   ├── src/
│   │   │   ├── schemas.ts
│   │   │   ├── types.ts
│   │   │   └── constants.ts
│   ├── database/               # Prisma スキーマ・マイグレーション・クライアント
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── src/
│   │       └── client.ts
│   └── storage/                # バイナリ保存抽象化
│       ├── src/
│       │   ├── interface.ts
│       │   └── local.ts
│       └── README.md
└── docs/
    ├── architecture.md
    └── mvp-1-acceptance.md
```

### パッケージ間の依存
- `apps/web` → `packages/shared`
- `apps/api` → `packages/shared`, `packages/database`, `packages/storage`
- `apps/runner` → `packages/shared`, `packages/database`, `packages/storage`

## 3. MVP-1 詳細実装計画

### 3.1 目標

「対象のステージング URL を 1 つ登録すると、同一オリジン内を BFS でクロールし、訪問した各画面のスクリーンショットとコンソールエラー・HTTP エラーをダッシュボードで一覧表示できる」

### 3.2 機能範囲

- 対象 URL は設定画面または環境変数で 1 つだけ登録
- 手動実行トリガー（ダッシュボードの「今すぐ実行」ボタン）
- 同一オリジン・同じベースパス以下のリンクを深さ 2 までクロール
- 各ページでスクリーンショットを取得
- コンソールエラー・JS ランタイムエラー・HTTP 4xx/5xx を検出
- 結果をダッシュボードで一覧表示

### 3.3 データモデル（Prisma）

```prisma
model Config {
  id            String   @id @default(cuid())
  baseUrl       String
  allowedOrigins String
  maxDepth      Int      @default(2)
  concurrency   Int      @default(2)
  delayMs       Int      @default(500)
  excludePatterns String // カンマ区切り or JSON
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Run {
  id          String    @id @default(cuid())
  status      String    // pending / running / completed / failed
  startedAt   DateTime  @default(now())
  finishedAt  DateTime?
  baseUrl     String
  configSnapshot Json   // 実行時設定のスナップショット
  pages       Page[]
}

model Page {
  id            String   @id @default(cuid())
  runId         String
  run           Run      @relation(fields: [runId], references: [id])
  url           String
  title         String?
  depth         Int
  statusCode    Int?
  hasJsError    Boolean  @default(false)
  hasHttpError  Boolean  @default(false)
  consoleLogs   Json?    // { level, message, location }[]
  screenshotPath String?
  visitedAt     DateTime @default(now())
}
```

### 3.4 API エンドポイント

| Method | Path | 説明 |
|---|---|---|
| GET | `/api/health` | ヘルスチェック |
| GET | `/api/config` | 現在の設定取得 |
| POST | `/api/config` | 設定更新（ステージングオリジンチェック） |
| POST | `/api/jobs/crawl` | クロールジョブをキューに追加（手動実行） |
| GET | `/api/jobs/:id` | ジョブ状態確認 |
| GET | `/api/runs` | 実行履歴一覧 |
| GET | `/api/runs/:id` | 実行詳細 |
| GET | `/api/runs/:id/pages` | 訪問ページ一覧 |
| GET | `/api/pages/:id/screenshot` | スクリーンショット画像取得 |

### 3.5 クローラー動作フロー

1. Worker が BullMQ ジョブ `CrawlJob` を受信
2. 設定読み込み → `baseUrl` のオリジンが `ALLOWED_STAGING_ORIGINS` / config.allowedOrigins に含まれるか検証
3. Playwright ブラウザ（Chromium）を 1 インスタンス起動
4. BFS キューに `baseUrl`（depth=0）を追加
5. 対象ページを `page.goto` し、以下を収集
   - スクリーンショット（png, 1280x720）
   - `console` イベント（error/warning）
   - `pageerror` イベント（JS ランタイムエラー）
   - `response` イベント（4xx/5xx 判定）
   - ページ内の `<a href>` から同一オリジンリンクを抽出（除外リスト・既訪問・depth 制限）
6. 収集データを DB/ストレージに保存
7. キューが空または最大ページ数に達するまで繰り返し
8. ブラウザを閉じて Run ステータスを completed / failed に更新

### 3.6 フロントエンド画面

- **Top（/）**: ベース URL 入力、設定項目（maxDepth/concurrency/delay/exclude patterns）、「今すぐ実行」ボタン
- **Runs（/runs）**: 実行履歴のカード/テーブル。ステータス、開始時刻、検出エラー数を表示
- **RunDetail（/runs/:id）**: 訪問ページの一覧。各行に URL、HTTP ステータス、JS エラー有無、サムネイル。クリックで拡大スクリーンショットとコンソールログ表示

### 3.7 非機能・セキュリティ

- 型定義は `packages/shared` に集約。API/Runner/Web 全てが同一スキーマを参照
- すべての外部入力は Zod で検証
- スクリーンショット保存先は `packages/storage` の抽象インターフェース経由。MVP-1 では `apps/runner/data/screenshots/` 以下に保存
- ステージング以外の URL は `guards.ts` で弾き、設定段階でも Zod カスタムチェックを行う
- 同時実行数・リクエスト間隔は設定化。BullMQ worker concurrency + ページ遷移 `delayMs`
- SQLite ファイルは `apps/api/data/` に配置し `.gitignore` 対象

### 3.8 テスト方針（MVP-1）

- `packages/shared`: Zod スキーマの単体テスト（Vitest）
- `apps/api`: 主要エンドポイントのスーパーテスト（Express + in-memory SQLite）
- `apps/runner`: `crawler.ts` をモックページでテスト（Playwright + ローカル静的 HTML サーバ）
- `apps/web`: コンポーネントの簡易レンダリングテスト（Vitest + React Testing Library）

### 3.9 マイルストーン（MVP-1 内）

| # | タスク | 成果物 |
|---|---|---|
| 1 | リポジトリ初期化・npm workspaces・TypeScript 設定 | ビルド通る雛形 |
| 2 | Prisma スキーマ + 共有スキーマ実装 | DB マイグレーション、Zod 型 |
| 3 | Storage 抽象 + ローカルアダプタ | ファイル保存/取得動作確認 |
| 4 | API 実装（config, jobs, runs） | POSTMAN/curl で動作確認 |
| 5 | Runner 実装（BFS クロール + ログ収集） | テスト用静的サイトで手動実行 |
| 6 | Web ダッシュボード実装 | ブラウザで「今すぐ実行」→結果表示 |
| 7 | テスト作成・README 整備 | PR レビュー可能な状態 |

## 4. MVP-2 〜 MVP-5 の概要

| MVP | 主な追加内容 |
|---|---|
| MVP-2 | フォーム操作の自動生成・正常系 E2E（入力→送信）、シナリオ定義 DSL |
| MVP-3 | 異常系データ（空・最大長・特殊文字・境界値）・異常系操作（連打・戻る・リロード） |
| MVP-4 | 認証情報暗号化・除外リスト強化・BullMQ repeatable ジョブによる定期実行 |
| MVP-5 | メール通知・PDF/Markdown エクスポート・過去実行との差分比較・重要度分類 |

## 5. 確認・承認をいただきたい項目

1. **対象リポジトリ**: `KazukiKandaKK/pre-release-checker` を本プロダクト用に使用してよいか
2. **DB の MVP-1 選定**: Prisma + SQLite（後から PostgreSQL 移行可能）で進めてよいか
3. **スケジューラ**: BullMQ の repeatable ジョブを使い、node-cron は採用しない方針でよいか
4. 上記設計・MVP-1 計画で承認を得たら、即座に実装フェーズ（ブランチ切り → PR）に進む

承認いただければ、MVP-1 のタスク 1 から順に実装・PR を作成します。
