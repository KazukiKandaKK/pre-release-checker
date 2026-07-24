import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, type ScenarioRun } from '../api/client.js';

export default function ScenarioRunDetail() {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<(ScenarioRun & { scenario: { name: string; steps: { type: string; label?: string }[] } }) | null>(null);
  const [error, setError] = useState<string>('');

  const load = () => {
    if (!id) return;
    api.getScenarioRun(id).then(setRun).catch((e) => setError(String(e)));
  };

  useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (run && (run.status === 'pending' || run.status === 'running')) {
        load();
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [id]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!run) return <p>読み込み中...</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">シナリオ実行詳細</h2>
      <div className="bg-white p-4 rounded shadow text-sm space-y-1">
        <p>
          <span className="font-medium">シナリオ:</span> {run.scenario.name}
        </p>
        <p>
          <span className="font-medium">状態:</span> {run.status}
        </p>
        <p>
          <span className="font-medium">開始:</span> {new Date(run.startedAt).toLocaleString()}
        </p>
        <p>
          <span className="font-medium">終了:</span>{' '}
          {run.finishedAt ? new Date(run.finishedAt).toLocaleString() : '-'}
        </p>
        {run.error && (
          <p className="text-red-600">
            <span className="font-medium">エラー:</span> {run.error}
          </p>
        )}
      </div>

      {run.result && (
        <>
          <h3 className="text-xl font-semibold">ステップ結果</h3>
          <div className="space-y-4">
            {run.result.stepResults.map((step, idx) => (
              <div key={idx} className="bg-white p-4 rounded shadow">
                <p className="font-medium">
                  Step {idx + 1}: {run.scenario.steps[idx]?.type || step.stepIndex} {' '}
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      step.status === 'ok' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {step.status}
                  </span>
                </p>
                {step.error && <p className="text-red-600 text-sm">{step.error}</p>}
                {step.durationMs !== undefined && (
                  <p className="text-xs text-gray-500">{step.durationMs}ms</p>
                )}
                {step.screenshotPath && (
                  <img
                    src={api.getScenarioStepScreenshotUrl(run.id, idx)}
                    alt={`step ${idx} screenshot`}
                    className="mt-2 w-48 border rounded object-contain"
                  />
                )}
              </div>
            ))}
          </div>

          {run.result.consoleLogs.length > 0 && (
            <details className="bg-white p-4 rounded shadow text-sm">
              <summary className="cursor-pointer font-medium">
                コンソールログ ({run.result.consoleLogs.length})
              </summary>
              <pre className="mt-2 bg-gray-900 text-gray-100 p-2 rounded overflow-auto max-h-40 text-xs">
                {JSON.stringify(run.result.consoleLogs, null, 2)}
              </pre>
            </details>
          )}
        </>
      )}
    </div>
  );
}
