import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, type Finding, type Run, type Page } from '../api/client.js';

const severityColor: Record<string, string> = {
  Critical: 'bg-red-100 text-red-800',
  High: 'bg-orange-100 text-orange-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  Low: 'bg-blue-100 text-blue-800',
};

export default function RunDetail() {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<(Run & { pages: Page[] }) | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!id) return;
    api.getRun(id).then(setRun).catch((e) => setError(String(e)));
  }, [id]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!run) return <p>読み込み中...</p>;

  const findings: Finding[] = run.findings ?? [];
  const newFindings = findings.filter((f) => f.isNew);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">実行詳細</h2>
      <div className="bg-white p-4 rounded shadow text-sm space-y-1">
        <p><span className="font-medium">ID:</span> {run.id}</p>
        <p><span className="font-medium">状態:</span> {run.status}</p>
        <p><span className="font-medium">ベース URL:</span> {run.baseUrl}</p>
        <p><span className="font-medium">開始:</span> {new Date(run.startedAt).toLocaleString()}</p>
        <p><span className="font-medium">終了:</span> {run.finishedAt ? new Date(run.finishedAt).toLocaleString() : '-'}</p>
        <p><span className="font-medium">訪問ページ数:</span> {run.pages.length}</p>
        <p><span className="font-medium">Findings:</span> {findings.length}（新規 {newFindings.length}）</p>
      </div>

      {findings.length > 0 && (
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-xl font-semibold mb-3">検出された問題</h3>
          <div className="space-y-2">
            {findings.map((f, idx) => (
              <div key={idx} className={`p-3 rounded flex items-start space-x-3 ${severityColor[f.severity] || 'bg-gray-100'}`}>
                <span className="font-bold whitespace-nowrap">[{f.severity}]</span>
                <div className="flex-1">
                  <p className="font-medium">{f.title}</p>
                  <p className="text-sm">{f.url || ''}</p>
                  <p className="text-sm">{f.description}</p>
                  {f.isNew && <span className="text-xs font-semibold">NEW</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h3 className="text-xl font-semibold">訪問ページ</h3>
      <div className="space-y-4">
        {run.pages.map((page) => (
          <div key={page.id} className="bg-white p-4 rounded shadow">
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <p className="font-medium break-all">{page.url}</p>
                <p className="text-sm text-gray-600">{page.title || '(タイトルなし)'}</p>
                <p className="text-sm">
                  深さ: {page.depth} / HTTP: {page.statusCode ?? '-'} / JS エラー: {page.hasJsError ? 'あり' : 'なし'} / HTTP エラー: {page.hasHttpError ? 'あり' : 'なし'}
                  {page.hasVisualDiff && ` / ビジュアル差分: ${((page.diffRatio ?? 0) * 100).toFixed(2)}%`}
                </p>
                {page.consoleLogs && page.consoleLogs.length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-red-600">
                      コンソールログ ({page.consoleLogs.length})
                    </summary>
                    <pre className="mt-2 bg-gray-900 text-gray-100 p-2 rounded overflow-auto max-h-40">
                      {JSON.stringify(page.consoleLogs, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
              <div className="ml-4 space-y-2">
                {page.screenshotPath && (
                  <img
                    src={api.getScreenshotUrl(page.runId, page.id)}
                    alt={`screenshot of ${page.url}`}
                    className="w-48 border rounded object-contain"
                  />
                )}
                {page.diffPath && (
                  <img
                    src={api.getDiffUrl(page.runId, page.id)}
                    alt={`diff of ${page.url}`}
                    className="w-48 border rounded object-contain"
                  />
                )}
              </div>
            </div>
          </div>
        ))}
        {run.pages.length === 0 && <p className="text-gray-500">ページがまだありません</p>}
      </div>
    </div>
  );
}
