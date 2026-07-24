import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, type Scenario, type ScenarioStep } from '../api/client.js';

export default function ScenarioDetail() {
  const { id } = useParams<{ id: string }>();
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (!id) return;
    api.getScenario(id).then(setScenario).catch((e) => setMessage(String(e)));
  }, [id]);

  const run = async () => {
    if (!id) return;
    try {
      const res = await api.runScenario(id);
      setMessage(`シナリオ実行を開始しました (scenarioRunId: ${res.scenarioRunId})`);
    } catch (err) {
      setMessage(`実行エラー: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  if (message && !scenario) return <p className="text-red-600">{message}</p>;
  if (!scenario) return <p>読み込み中...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{scenario.name}</h2>
          <p className="text-gray-600">{scenario.description}</p>
          <p className="text-sm text-gray-500 mt-1">
            risk: {scenario.risk} / status: {scenario.status} / source: {scenario.source}
          </p>
        </div>
        <button
          onClick={run}
          disabled={scenario.status !== 'active'}
          className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-500 disabled:bg-gray-400"
        >
          このシナリオを実行
        </button>
      </div>
      {message && <p className="text-sm text-gray-700">{message}</p>}
      <h3 className="text-xl font-semibold">ステップ</h3>
      <ol className="list-decimal list-inside bg-white rounded shadow divide-y">
        {scenario.steps.map((step, idx) => (
          <li key={idx} className="p-4">
            <StepDescription step={step} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function StepDescription({ step }: { step: ScenarioStep }) {
  switch (step.type) {
    case 'navigate':
      return <span>ナビゲート: {step.url}</span>;
    case 'fill':
      return <span>入力: {step.label || step.selector} = {step.value}</span>;
    case 'select':
      return <span>選択: {step.label || step.selector} = {step.value}</span>;
    case 'click':
      return <span>クリック: {step.label || step.selector}</span>;
    case 'submit':
      return <span>送信: {step.label || step.selector}</span>;
    case 'assertText':
      return <span>確認: {step.operator === 'contains' ? `contains "${step.text}"` : `exists text`}</span>;
    case 'reload':
      return <span>リロード</span>;
    case 'goBack':
      return <span>戻る</span>;
    case 'goForward':
      return <span>進む</span>;
    case 'rapidClick':
      return <span>連打: {step.label || step.selector} x{step.times}</span>;
    case 'clear':
      return <span>クリア: {step.label || step.selector}</span>;
    case 'wait':
      return <span>待機: {step.durationMs}ms</span>;
    default:
      return <span>unknown step</span>;
  }
}
