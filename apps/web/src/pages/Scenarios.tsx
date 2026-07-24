import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Scenario } from '../api/client.js';

export default function Scenarios() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    api.getScenarios().then(setScenarios).catch((e) => setMessage(String(e)));
  }, []);

  const run = async (id: string) => {
    try {
      const res = await api.runScenario(id);
      setMessage(`シナリオ実行を開始しました (scenarioRunId: ${res.scenarioRunId})`);
    } catch (err) {
      setMessage(`実行エラー: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">シナリオ一覧</h2>
      {message && <p className="text-sm text-gray-700 mb-4">{message}</p>}
      <div className="space-y-4">
        {scenarios.map((scenario) => (
          <div key={scenario.id} className="bg-white p-4 rounded shadow">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">
                  <Link to={`/scenarios/${scenario.id}`} className="text-blue-600 hover:underline">
                    {scenario.name}
                  </Link>
                </h3>
                <p className="text-sm text-gray-600">{scenario.description}</p>
                <p className="text-xs text-gray-500 mt-1">
                  source: {scenario.source} / risk: {scenario.risk} / status: {scenario.status}
                </p>
              </div>
              <button
                onClick={() => run(scenario.id)}
                disabled={scenario.status !== 'active'}
                className="bg-emerald-600 text-white px-3 py-1 rounded text-sm hover:bg-emerald-500 disabled:bg-gray-400"
              >
                実行
              </button>
            </div>
          </div>
        ))}
        {scenarios.length === 0 && <p className="text-gray-500">シナリオがありません。クロールを実行すると自動生成されます。</p>}
      </div>
    </div>
  );
}
