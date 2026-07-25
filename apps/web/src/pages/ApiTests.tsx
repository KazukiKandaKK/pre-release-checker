import { useEffect, useState } from 'react';
import { api, type ApiEndpoint, type ApiEndpointForm, type ApiTestRun } from '../api/client.js';

interface ImportPreview {
  count: number;
  baseUrl: string;
  endpoints: ApiEndpoint[];
}

const defaultForm: ApiEndpointForm = {
  name: '',
  method: 'GET',
  url: '',
  headers: '',
  body: '',
  expectedStatus: undefined,
  expectedContentType: '',
  timeoutMs: 5000,
};

export default function ApiTests() {
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [runs, setRuns] = useState<ApiTestRun[]>([]);
  const [form, setForm] = useState<ApiEndpointForm>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [selectedRun, setSelectedRun] = useState<ApiTestRun | null>(null);

  const [importSpec, setImportSpec] = useState('');
  const [importBaseUrl, setImportBaseUrl] = useState('');
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importing, setImporting] = useState(false);

  const load = async () => {
    try {
      const [epList, runList] = await Promise.all([api.getApiEndpoints(), api.getApiTestRuns()]);
      setEndpoints(epList);
      setRuns(runList);
    } catch (err) {
      setMessage(`読み込みエラー: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(() => load(), 3000);
    return () => clearInterval(timer);
  }, []);

  const update = (field: keyof ApiEndpointForm, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const reset = () => {
    setForm(defaultForm);
    setEditingId(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.updateApiEndpoint(editingId, form);
      } else {
        await api.createApiEndpoint(form);
      }
      await load();
      reset();
      setMessage(editingId ? '更新しました' : '追加しました');
    } catch (err) {
      setMessage(`保存エラー: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const edit = (ep: ApiEndpoint) => {
    setForm({
      name: ep.name,
      method: ep.method,
      url: ep.url,
      headers: ep.headers || '',
      body: ep.body || '',
      expectedStatus: ep.expectedStatus,
      expectedContentType: ep.expectedContentType || '',
      timeoutMs: ep.timeoutMs,
    });
    setEditingId(ep.id);
  };

  const remove = async (id: string) => {
    if (!confirm('削除しますか？')) return;
    try {
      await api.deleteApiEndpoint(id);
      await load();
      setMessage('削除しました');
    } catch (err) {
      setMessage(`削除エラー: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const start = async () => {
    try {
      const res = await api.startApiTest();
      setMessage(`実行を開始しました (runId: ${res.apiTestRunId})`);
      await load();
    } catch (err) {
      setMessage(`実行エラー: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-semibold">API テスト</h2>

      <div className="bg-white p-6 rounded shadow space-y-4">
        <h3 className="text-lg font-medium">OpenAPI / Swagger インポート</h3>
        <p className="text-sm text-gray-600">
          JSON または YAML 形式の OpenAPI 3.x / Swagger 2.0 仕様書を貼り付けて、エンドポイントを一括登録できます。baseUrl が未指定の場合は仕様書内の servers / host を使用します。
        </p>
        <div className="col-span-2">
          <label className="block text-sm font-medium mb-1">baseUrl（オプション）</label>
          <input
            type="url"
            className="w-full border rounded px-3 py-2"
            value={importBaseUrl}
            onChange={(e) => setImportBaseUrl(e.target.value)}
            placeholder="http://host.docker.internal:3000"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium mb-1">仕様書（JSON or YAML）</label>
          <textarea
            rows={8}
            className="w-full border rounded px-3 py-2 font-mono text-sm"
            value={importSpec}
            onChange={(e) => setImportSpec(e.target.value)}
            placeholder={`openapi: 3.0.0\nservers:\n  - url: http://localhost:3000/api\npaths:\n  /users:\n    get:\n      operationId: listUsers`}
          />
        </div>
        <div className="flex space-x-4">
          <button
            type="button"
            disabled={!importSpec.trim() || importing}
            onClick={async () => {
              try {
                setImporting(true);
                const res = await api.importOpenApi({ spec: importSpec, baseUrl: importBaseUrl || undefined, dryRun: true });
                setImportPreview(res);
                setMessage(`${res.count} 件のエンドポイントを検出しました`);
              } catch (err) {
                setMessage(`プレビューエラー: ${err instanceof Error ? err.message : String(err)}`);
                setImportPreview(null);
              } finally {
                setImporting(false);
              }
            }}
            className="bg-slate-700 text-white px-4 py-2 rounded hover:bg-slate-600 disabled:opacity-50"
          >
            プレビュー
          </button>
          <button
            type="button"
            disabled={!importSpec.trim() || importing}
            onClick={async () => {
              try {
                setImporting(true);
                await api.importOpenApi({ spec: importSpec, baseUrl: importBaseUrl || undefined, dryRun: false });
                setImportSpec('');
                setImportBaseUrl('');
                setImportPreview(null);
                await load();
                setMessage('インポートしました');
              } catch (err) {
                setMessage(`インポートエラー: ${err instanceof Error ? err.message : String(err)}`);
              } finally {
                setImporting(false);
              }
            }}
            className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-500 disabled:opacity-50"
          >
            インポート
          </button>
        </div>
        {importPreview && (
          <div className="space-y-2">
            <p className="text-sm text-gray-700">
              検出数: {importPreview.count} / baseUrl: {importPreview.baseUrl}
            </p>
            <table className="w-full text-sm border">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-1 px-2">名前</th>
                  <th className="text-left py-1 px-2">メソッド</th>
                  <th className="text-left py-1 px-2">URL</th>
                </tr>
              </thead>
              <tbody>
                {importPreview.endpoints.map((ep, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-1 px-2">{ep.name}</td>
                    <td className="py-1 px-2">{ep.method}</td>
                    <td className="py-1 px-2 break-all">{ep.url}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <form onSubmit={submit} className="bg-white p-6 rounded shadow space-y-4">
        <h3 className="text-lg font-medium">エンドポイント {editingId ? '編集' : '追加'}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">名前</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">メソッド</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={form.method}
              onChange={(e) => update('method', e.target.value)}
            >
              {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">URL</label>
            <input
              type="url"
              className="w-full border rounded px-3 py-2"
              value={form.url}
              onChange={(e) => update('url', e.target.value)}
              required
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Headers（JSON）</label>
            <textarea
              rows={2}
              className="w-full border rounded px-3 py-2"
              value={form.headers}
              onChange={(e) => update('headers', e.target.value)}
              placeholder='{"Authorization":"Bearer xxx"}'
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Body</label>
            <textarea
              rows={3}
              className="w-full border rounded px-3 py-2"
              value={form.body}
              onChange={(e) => update('body', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">期待ステータスコード</label>
            <input
              type="number"
              min={100}
              max={599}
              className="w-full border rounded px-3 py-2"
              value={form.expectedStatus ?? ''}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  expectedStatus: e.target.value === '' ? undefined : Number(e.target.value),
                }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">期待 Content-Type（部分一致）</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={form.expectedContentType}
              onChange={(e) => update('expectedContentType', e.target.value)}
              placeholder="application/json"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">タイムアウト (ms)</label>
            <input
              type="number"
              min={1}
              max={60000}
              className="w-full border rounded px-3 py-2"
              value={form.timeoutMs}
              onChange={(e) => update('timeoutMs', Number(e.target.value))}
              required
            />
          </div>
        </div>
        <div className="flex space-x-4">
          <button type="submit" className="bg-slate-700 text-white px-4 py-2 rounded hover:bg-slate-600">
            {editingId ? '更新' : '追加'}
          </button>
          {editingId && (
            <button type="button" onClick={reset} className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">
              キャンセル
            </button>
          )}
        </div>
      </form>

      <div className="bg-white p-6 rounded shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">登録済みエンドポイント</h3>
          <button
            onClick={start}
            className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-500"
          >
            すべて実行
          </button>
        </div>
        {endpoints.length === 0 ? (
          <p className="text-gray-600">エンドポイントが登録されていません。</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">名前</th>
                <th className="text-left py-2">メソッド</th>
                <th className="text-left py-2">URL</th>
                <th className="text-left py-2">期待</th>
                <th className="text-left py-2"></th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map((ep) => (
                <tr key={ep.id} className="border-b">
                  <td className="py-2">{ep.name}</td>
                  <td className="py-2">{ep.method}</td>
                  <td className="py-2 break-all">{ep.url}</td>
                  <td className="py-2">{ep.expectedStatus ?? '-'}</td>
                  <td className="py-2 space-x-2">
                    <button onClick={() => edit(ep)} className="text-blue-600 hover:underline">編集</button>
                    <button onClick={() => remove(ep.id)} className="text-red-600 hover:underline">削除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white p-6 rounded shadow">
        <h3 className="text-lg font-medium mb-4">実行履歴</h3>
        {runs.length === 0 ? (
          <p className="text-gray-600">実行履歴がありません。</p>
        ) : (
          <ul className="space-y-2">
            {runs.map((run) => (
              <li key={run.id} className="border p-3 rounded">
                <button onClick={() => setSelectedRun(run)} className="text-blue-600 hover:underline text-sm">
                  {run.id.slice(0, 8)} / {run.status} / {run.startedAt}
                </button>
                {run.findings && run.findings.length > 0 && (
                  <span className="ml-2 text-red-600 text-sm">{run.findings.length} 件の問題</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedRun && (
        <div className="bg-white p-6 rounded shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">実行詳細: {selectedRun.id.slice(0, 8)}</h3>
            <button onClick={() => setSelectedRun(null)} className="text-sm text-gray-600">閉じる</button>
          </div>
          <p className="text-sm text-gray-600 mb-2">状態: {selectedRun.status}</p>
          {selectedRun.error && <p className="text-red-600 text-sm mb-2">{selectedRun.error}</p>}
          {selectedRun.findings && selectedRun.findings.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium">検出された問題</h4>
              <ul className="list-disc pl-5 text-sm">
                {selectedRun.findings.map((f, i) => (
                  <li key={i}>[{f.severity}] {f.title}: {f.description}</li>
                ))}
              </ul>
            </div>
          )}
          {selectedRun.results && selectedRun.results.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">名前</th>
                  <th className="text-left py-2">結果</th>
                  <th className="text-left py-2">HTTP</th>
                  <th className="text-left py-2">時間 (ms)</th>
                  <th className="text-left py-2">Content-Type</th>
                  <th className="text-left py-2">エラー</th>
                </tr>
              </thead>
              <tbody>
                {selectedRun.results.map((r, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2">{r.name}</td>
                    <td className="py-2">{r.status}</td>
                    <td className="py-2">{r.statusCode ?? '-'}</td>
                    <td className="py-2">{r.responseTimeMs}</td>
                    <td className="py-2">{r.contentType ?? '-'}</td>
                    <td className="py-2 text-red-600">{r.error ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {message && <p className="text-sm text-gray-700">{message}</p>}
    </div>
  );
}
