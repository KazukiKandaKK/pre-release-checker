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
  authType: 'none',
  authLoginUrl: '',
  authUsername: '',
  authPassword: '',
  authCookie: '',
  authToken: '',
  scheduleEnabled: false,
  scheduleCron: '0 9 * * *',
  scheduleJobType: 'crawl',
  mailEnabled: false,
  mailHost: '',
  mailPort: 587,
  mailSecure: false,
  mailUser: '',
  mailFrom: '',
  mailTo: '',
  mailPassword: '',
  visualDiffThreshold: 0.05,
};

export default function Home() {
  const [form, setForm] = useState<ConfigForm>(defaultForm);
  const [message, setMessage] = useState<string>('');
  const [runId, setRunId] = useState<string>('');

  useEffect(() => {
    api.getConfig().then((cfg) => setForm({ ...defaultForm, ...cfg })).catch(() => {});
  }, []);

  const update = (field: keyof ConfigForm, value: string | number | boolean) => {
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

  const authFieldsVisible = form.authType !== 'none';

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-semibold">設定と実行</h2>
      <form onSubmit={save} className="bg-white p-6 rounded shadow space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">基本設定</h3>
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
              placeholder="http://localhost:8080"
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
            <label className="block text-sm font-medium mb-1">除外 URL パターン（1 行ずつ。ワイルドカード * ? 可）</label>
            <textarea
              rows={4}
              className="w-full border rounded px-3 py-2"
              value={form.excludePatterns}
              onChange={(e) => update('excludePatterns', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4 border-t pt-4">
          <h3 className="text-lg font-medium">認証設定（ステージング用テストアカウント）</h3>
          <div>
            <label className="block text-sm font-medium mb-1">認証方式</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={form.authType}
              onChange={(e) => update('authType', e.target.value)}
            >
              <option value="none">なし</option>
              <option value="cookie">Cookie</option>
              <option value="basic">Basic 認証</option>
              <option value="oauth">OAuth トークン</option>
              <option value="password">フォーム認証（ID/PW）</option>
            </select>
          </div>
          {authFieldsVisible && (
            <div className="space-y-4">
              {form.authType === 'password' && (
                <div>
                  <label className="block text-sm font-medium mb-1">ログイン URL</label>
                  <input
                    type="url"
                    className="w-full border rounded px-3 py-2"
                    value={form.authLoginUrl}
                    onChange={(e) => update('authLoginUrl', e.target.value)}
                    placeholder={form.baseUrl}
                  />
                </div>
              )}
              {(form.authType === 'basic' || form.authType === 'password') && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">ユーザー名 / ID</label>
                    <input
                      type="text"
                      className="w-full border rounded px-3 py-2"
                      value={form.authUsername}
                      onChange={(e) => update('authUsername', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">パスワード</label>
                    <input
                      type="password"
                      className="w-full border rounded px-3 py-2"
                      value={form.authPassword}
                      onChange={(e) => update('authPassword', e.target.value)}
                    />
                  </div>
                </>
              )}
              {form.authType === 'cookie' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Cookie（name=value; ...）</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    value={form.authCookie}
                    onChange={(e) => update('authCookie', e.target.value)}
                  />
                </div>
              )}
              {form.authType === 'oauth' && (
                <div>
                  <label className="block text-sm font-medium mb-1">OAuth トークン</label>
                  <input
                    type="password"
                    className="w-full border rounded px-3 py-2"
                    value={form.authToken}
                    onChange={(e) => update('authToken', e.target.value)}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4 border-t pt-4">
          <h3 className="text-lg font-medium">定期実行スケジュール</h3>
          <div className="flex items-center space-x-2">
            <input
              id="scheduleEnabled"
              type="checkbox"
              checked={form.scheduleEnabled}
              onChange={(e) => update('scheduleEnabled', e.target.checked)}
            />
            <label htmlFor="scheduleEnabled" className="text-sm font-medium">
              定期実行を有効にする
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Cron 式</label>
              <input
                type="text"
                className="w-full border rounded px-3 py-2"
                value={form.scheduleCron}
                onChange={(e) => update('scheduleCron', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">実行対象</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={form.scheduleJobType}
                onChange={(e) => update('scheduleJobType', e.target.value)}
              >
                <option value="crawl">クロール</option>
                <option value="scenarios">全シナリオ</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-4 border-t pt-4">
          <h3 className="text-lg font-medium">メール通知（SMTP）</h3>
          <div className="flex items-center space-x-2">
            <input
              id="mailEnabled"
              type="checkbox"
              checked={form.mailEnabled}
              onChange={(e) => update('mailEnabled', e.target.checked)}
            />
            <label htmlFor="mailEnabled" className="text-sm font-medium">
              メール通知を有効にする
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">SMTP ホスト</label>
              <input
                type="text"
                className="w-full border rounded px-3 py-2"
                value={form.mailHost}
                onChange={(e) => update('mailHost', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ポート</label>
              <input
                type="number"
                min={1}
                max={65535}
                className="w-full border rounded px-3 py-2"
                value={form.mailPort}
                onChange={(e) => update('mailPort', Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ユーザー名</label>
              <input
                type="text"
                className="w-full border rounded px-3 py-2"
                value={form.mailUser}
                onChange={(e) => update('mailUser', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">パスワード</label>
              <input
                type="password"
                className="w-full border rounded px-3 py-2"
                value={form.mailPassword}
                onChange={(e) => update('mailPassword', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">From</label>
              <input
                type="email"
                className="w-full border rounded px-3 py-2"
                value={form.mailFrom}
                onChange={(e) => update('mailFrom', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">To（カンマ区切り）</label>
              <input
                type="text"
                className="w-full border rounded px-3 py-2"
                value={form.mailTo}
                onChange={(e) => update('mailTo', e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <input
              id="mailSecure"
              type="checkbox"
              checked={form.mailSecure}
              onChange={(e) => update('mailSecure', e.target.checked)}
            />
            <label htmlFor="mailSecure" className="text-sm font-medium">
              TLS（secure）を使用
            </label>
          </div>
        </div>

        <div className="space-y-4 border-t pt-4">
          <h3 className="text-lg font-medium">ビジュアル差分</h3>
          <div>
            <label className="block text-sm font-medium mb-1">差分判定閾値（0〜1）</label>
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              className="w-full border rounded px-3 py-2"
              value={form.visualDiffThreshold}
              onChange={(e) => update('visualDiffThreshold', Number(e.target.value))}
            />
          </div>
        </div>

        <div className="flex space-x-4 border-t pt-4">
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
