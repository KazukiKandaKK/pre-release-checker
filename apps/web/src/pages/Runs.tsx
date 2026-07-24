import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Run } from '../api/client.js';

export default function Runs() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    api.getRuns().then(setRuns).catch((e) => setError(String(e)));
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">実行履歴</h2>
      {error && <p className="text-red-600">{error}</p>}
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">状態</th>
              <th className="px-4 py-2">ベース URL</th>
              <th className="px-4 py-2">Findings</th>
              <th className="px-4 py-2">開始時刻</th>
              <th className="px-4 py-2">終了時刻</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id} className="border-t">
                <td className="px-4 py-2">
                  <Link to={`/runs/${run.id}`} className="text-blue-600 hover:underline">
                    {run.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="px-4 py-2">{run.status}</td>
                <td className="px-4 py-2 truncate max-w-xs">{run.baseUrl}</td>
                <td className="px-4 py-2">{run.findings ? run.findings.length : '-'}</td>
                <td className="px-4 py-2">{new Date(run.startedAt).toLocaleString()}</td>
                <td className="px-4 py-2">{run.finishedAt ? new Date(run.finishedAt).toLocaleString() : '-'}</td>
              </tr>
            ))}
            {runs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-gray-500">
                  実行履歴がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
