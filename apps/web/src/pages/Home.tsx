import { useEffect, useState } from 'react';
import { api, type ConfigForm } from '../api/client.js';

const defaultForm: ConfigForm = {
  baseUrl: '',
  allowedOrigins: '',
  maxDepth: 2,
  concurrency: 2,
  delayMs: 500,
  maxPages: 50,
  excludePatterns: '',
};

export default function Home() {
  const [form, setForm] = useState<ConfigForm>(defaultForm);
  const [message, setMessage] = useState<string>('');
  const [runId, setRunId] = useState<string>('');

  useEffect(() => {
    api.getConfig().then((cfg) => setForm(cfg)).catch(() => {});
  }, []);

  const update = (field: keyof ConfigForm, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.saveConfig(form);
      setMessage('設定を保存しました');
    } catch (err) {
      setMessage(`保存エラー: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const run = async () => {
    try {
      const res = await api.startCrawl(form.baseUrl);
      setRunId(res.runId);
      setMessage(`実行を開始しました (runId: ${res.runId})`);
    } catch (err) {
      setMessage(`実行エラー: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-semibold">設定と実行</h2>
      <form onSubmit={save} className="bg-white p-6 rounded shadow space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">ステージングベース URL</label>
          <input
            type="url"
            required
            className="w-full border rounded px-3 py-2"
            value={form.baseUrl}
            onChange={(e) => update('baseUrl', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">許可オリジン（カンマ区切り）</label>
          <input
            type="text"
            required
            className="w-full border rounded px-3 py-2"
            value={form.allowedOrigins}
            onChange={(e) => update('allowedOrigins', e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">最大クロール深さ</label>
            <input
              type="number"
              min={0}
              max={5}
              className="w-full border rounded px-3 py-2"
              value={form.maxDepth}
              onChange={(e) => update('maxDepth', Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">最大ページ数</label>
            <input
              type="number"
              min={1}
              max={200}
              className="w-full border rounded px-3 py-2"
              value={form.maxPages}
              onChange={(e) => update('maxPages', Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">同時実行数</label>
            <input
              type="number"
              min={1}
              max={10}
              className="w-full border rounded px-3 py-2"
              value={form.concurrency}
              onChange={(e) => update('concurrency', Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">リクエスト間隔 (ms)</label>
            <input
              type="number"
              min={0}
              max={10000}
              className="w-full border rounded px-3 py-2"
              value={form.delayMs}
              onChange={(e) => update('delayMs', Number(e.target.value))}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">除外 URL パターン（1 行ずつ）</label>
          <textarea
            rows={4}
            className="w-full border rounded px-3 py-2"
            value={form.excludePatterns}
            onChange={(e) => update('excludePatterns', e.target.value)}
          />
        </div>
        <div className="flex space-x-4">
          <button type="submit" className="bg-slate-700 text-white px-4 py-2 rounded hover:bg-slate-600">
            設定を保存
          </button>
          <button
            type="button"
            onClick={run}
            className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-500"
          >
            今すぐ実行
          </button>
        </div>
        {message && <p className="text-sm text-gray-700">{message}</p>}
        {runId && (
          <a href={`/runs/${runId}`} className="text-blue-600 hover:underline text-sm">
            実行結果を開く
          </a>
        )}
      </form>
    </div>
  );
}
