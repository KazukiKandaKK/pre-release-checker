import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type ScenarioForm as ScenarioFormData, type ScenarioStep } from '../api/client.js';

const STEP_TYPES: ScenarioStep['type'][] = [
  'navigate',
  'fill',
  'select',
  'click',
  'clickAt',
  'typeText',
  'dragAt',
  'submit',
  'assertText',
  'reload',
  'goBack',
  'goForward',
  'rapidClick',
  'clear',
  'wait',
];

const TYPE_LABELS: Record<ScenarioStep['type'], string> = {
  navigate: 'ページ遷移',
  fill: '入力',
  select: '選択',
  click: 'クリック（CSS）',
  clickAt: 'クリック（座標）',
  typeText: 'キー入力',
  dragAt: 'ドラッグ（座標）',
  submit: '送信',
  assertText: 'テキスト確認',
  reload: 'リロード',
  goBack: '戻る',
  goForward: '進む',
  rapidClick: '連打',
  clear: 'クリア',
  wait: '待機',
};

function defaultStep(type: ScenarioStep['type']): ScenarioStep {
  switch (type) {
    case 'navigate':
      return { type, url: '', label: '' };
    case 'fill':
      return { type, selector: '', value: '', label: '' };
    case 'select':
      return { type, selector: '', value: '', label: '' };
    case 'click':
      return { type, selector: '', label: '' };
    case 'clickAt':
      return { type, x: 0, y: 0, label: '' };
    case 'typeText':
      return { type, text: '', label: '' };
    case 'dragAt':
      return { type, fromX: 0, fromY: 0, toX: 0, toY: 0, label: '' };
    case 'submit':
      return { type, selector: '', label: '' };
    case 'assertText':
      return { type, text: '', operator: 'contains', label: '' };
    case 'reload':
      return { type, label: '' };
    case 'goBack':
      return { type, label: '' };
    case 'goForward':
      return { type, label: '' };
    case 'rapidClick':
      return { type, selector: '', times: 3, label: '' };
    case 'clear':
      return { type, selector: '', label: '' };
    case 'wait':
      return { type, durationMs: 1000, label: '' };
    default:
      return { type: 'wait', durationMs: 1000, label: '' };
  }
}

const defaultForm: ScenarioFormData = {
  name: '',
  description: '',
  baseUrl: '',
  pageUrl: '',
  risk: 'safe',
  status: 'active',
  steps: [defaultStep('navigate')],
};

export default function ScenarioForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState<ScenarioFormData>(defaultForm);
  const [message, setMessage] = useState('');

  const updateField = <K extends keyof ScenarioFormData>(field: K, value: ScenarioFormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateStep = (index: number, patch: Partial<ScenarioStep>) => {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.map((step, i) => (i === index ? { ...step, ...patch } : step)),
    }));
  };

  const changeStepType = (index: number, type: ScenarioStep['type']) => {
    setForm((prev) => {
      const steps = [...prev.steps];
      const label = steps[index]?.label || '';
      steps[index] = { ...defaultStep(type), label };
      return { ...prev, steps };
    });
  };

  const addStep = (index: number) => {
    setForm((prev) => {
      const steps = [...prev.steps];
      steps.splice(index + 1, 0, defaultStep('navigate'));
      return { ...prev, steps };
    });
  };

  const removeStep = (index: number) => {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index),
    }));
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= form.steps.length) return;
    setForm((prev) => {
      const steps = [...prev.steps];
      [steps[index], steps[newIndex]] = [steps[newIndex], steps[index]];
      return { ...prev, steps };
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const scenario = await api.createScenario(form);
      navigate(`/scenarios/${scenario.id}`);
    } catch (err) {
      setMessage(`作成エラー: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-8">
      <h2 className="text-2xl font-semibold">新規シナリオ作成</h2>

      {message && <p className="text-sm text-red-600">{message}</p>}

      <div className="bg-white p-6 rounded shadow space-y-4">
        <h3 className="text-lg font-medium">基本情報</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">名前 *</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              required
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">説明</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">ベース URL *</label>
            <input
              type="url"
              className="w-full border rounded px-3 py-2"
              value={form.baseUrl}
              onChange={(e) => updateField('baseUrl', e.target.value)}
              placeholder="http://host.docker.internal:3000"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">ページ URL *</label>
            <input
              type="url"
              className="w-full border rounded px-3 py-2"
              value={form.pageUrl}
              onChange={(e) => updateField('pageUrl', e.target.value)}
              placeholder="http://host.docker.internal:3000/login"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">リスク</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={form.risk}
              onChange={(e) => updateField('risk', e.target.value as ScenarioFormData['risk'])}
            >
              <option value="safe">safe</option>
              <option value="needs-auth">needs-auth</option>
              <option value="destructive">destructive</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">ステータス</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={form.status}
              onChange={(e) => updateField('status', e.target.value as ScenarioFormData['status'])}
            >
              <option value="active">active</option>
              <option value="disabled">disabled</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded shadow space-y-4">
        <h3 className="text-lg font-medium">ステップ</h3>
        {form.steps.length === 0 && <p className="text-gray-600">ステップを追加してください。</p>}
        <div className="space-y-4">
          {form.steps.map((step, index) => (
            <StepEditor
              key={index}
              index={index}
              step={step}
              total={form.steps.length}
              pageUrl={form.pageUrl}
              updateStep={updateStep}
              changeStepType={changeStepType}
              addStep={addStep}
              removeStep={removeStep}
              moveStep={moveStep}
            />
          ))}
        </div>
      </div>

      <div className="flex space-x-4">
        <button
          type="submit"
          disabled={!form.name || form.steps.length === 0}
          className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-500 disabled:opacity-50"
        >
          作成する
        </button>
        <button
          type="button"
          onClick={() => navigate('/scenarios')}
          className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}

interface StepEditorProps {
  index: number;
  step: ScenarioStep;
  total: number;
  pageUrl: string;
  updateStep: (index: number, patch: Partial<ScenarioStep>) => void;
  changeStepType: (index: number, type: ScenarioStep['type']) => void;
  addStep: (index: number) => void;
  removeStep: (index: number) => void;
  moveStep: (index: number, direction: -1 | 1) => void;
}

function StepEditor({
  index,
  step,
  total,
  pageUrl,
  updateStep,
  changeStepType,
  addStep,
  removeStep,
  moveStep,
}: StepEditorProps) {
  return (
    <div className="border rounded p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-semibold text-gray-500">{index + 1}</span>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={step.type}
            onChange={(e) => changeStepType(index, e.target.value as ScenarioStep['type'])}
          >
            {STEP_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => moveStep(index, -1)}
            disabled={index === 0}
            className="text-sm px-2 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => moveStep(index, 1)}
            disabled={index === total - 1}
            className="text-sm px-2 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={() => addStep(index)}
            className="text-sm px-2 py-1 border rounded hover:bg-gray-100"
          >
            ＋
          </button>
          <button
            type="button"
            onClick={() => removeStep(index)}
            disabled={total <= 1}
            className="text-sm px-2 py-1 border rounded text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            削除
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">ラベル（オプション）</label>
        <input
          className="w-full border rounded px-3 py-2 text-sm"
          value={step.label || ''}
          onChange={(e) => updateStep(index, { label: e.target.value })}
        />
      </div>

      {step.type === 'navigate' && (
        <div>
          <label className="block text-sm font-medium mb-1">URL *</label>
          <input
            type="url"
            className="w-full border rounded px-3 py-2 text-sm"
            value={step.url || ''}
            onChange={(e) => updateStep(index, { url: e.target.value })}
            required
          />
        </div>
      )}

      {(step.type === 'fill' || step.type === 'select' || step.type === 'click' || step.type === 'submit' || step.type === 'clear' || step.type === 'rapidClick') && (
        <div>
          <label className="block text-sm font-medium mb-1">セレクタ *</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            value={step.selector || ''}
            onChange={(e) => updateStep(index, { selector: e.target.value })}
            required
          />
        </div>
      )}

      {(step.type === 'fill' || step.type === 'select') && (
        <div>
          <label className="block text-sm font-medium mb-1">値 *</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            value={step.value || ''}
            onChange={(e) => updateStep(index, { value: e.target.value })}
            required
          />
        </div>
      )}

      {step.type === 'clickAt' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">X</label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2 text-sm"
                value={step.x ?? 0}
                onChange={(e) => updateStep(index, { x: Number(e.target.value) })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Y</label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2 text-sm"
                value={step.y ?? 0}
                onChange={(e) => updateStep(index, { y: Number(e.target.value) })}
                required
              />
            </div>
          </div>
          <CoordinatePicker pageUrl={pageUrl} step={step} onChange={(patch) => updateStep(index, patch)} />
        </>
      )}

      {step.type === 'typeText' && (
        <div>
          <label className="block text-sm font-medium mb-1">入力テキスト *</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            value={step.text || ''}
            onChange={(e) => updateStep(index, { text: e.target.value })}
            required
          />
        </div>
      )}

      {step.type === 'dragAt' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">開始 X</label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2 text-sm"
                value={step.fromX ?? 0}
                onChange={(e) => updateStep(index, { fromX: Number(e.target.value) })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">開始 Y</label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2 text-sm"
                value={step.fromY ?? 0}
                onChange={(e) => updateStep(index, { fromY: Number(e.target.value) })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">終了 X</label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2 text-sm"
                value={step.toX ?? 0}
                onChange={(e) => updateStep(index, { toX: Number(e.target.value) })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">終了 Y</label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2 text-sm"
                value={step.toY ?? 0}
                onChange={(e) => updateStep(index, { toY: Number(e.target.value) })}
                required
              />
            </div>
          </div>
          <CoordinatePicker pageUrl={pageUrl} step={step} onChange={(patch) => updateStep(index, patch)} />
        </>
      )}

      {step.type === 'assertText' && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1">検索テキスト *</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              value={step.text || ''}
              onChange={(e) => updateStep(index, { text: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">演算子</label>
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={step.operator || 'contains'}
              onChange={(e) => updateStep(index, { operator: e.target.value as 'contains' | 'exists' })}
            >
              <option value="contains">contains（含む）</option>
              <option value="exists">exists（存在する）</option>
            </select>
          </div>
        </>
      )}

      {step.type === 'rapidClick' && (
        <div>
          <label className="block text-sm font-medium mb-1">連打回数</label>
          <input
            type="number"
            min={1}
            max={50}
            className="w-full border rounded px-3 py-2 text-sm"
            value={step.times ?? 3}
            onChange={(e) => updateStep(index, { times: Number(e.target.value) })}
          />
        </div>
      )}

      {step.type === 'wait' && (
        <div>
          <label className="block text-sm font-medium mb-1">待機時間 (ms)</label>
          <input
            type="number"
            min={0}
            max={60000}
            className="w-full border rounded px-3 py-2 text-sm"
            value={step.durationMs ?? 1000}
            onChange={(e) => updateStep(index, { durationMs: Number(e.target.value) })}
          />
        </div>
      )}
    </div>
  );
}

interface CoordinatePickerProps {
  pageUrl: string;
  step: ScenarioStep;
  onChange: (patch: Partial<ScenarioStep>) => void;
}

function CoordinatePicker({ pageUrl, step, onChange }: CoordinatePickerProps) {
  const [preview, setPreview] = useState<{ screenshot: string; viewport: { width: number; height: number } } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragMode, setDragMode] = useState<'start' | 'end'>('start');

  const fetchPreview = async () => {
    if (!pageUrl) {
      setError('ページ URL を入力してください');
      return;
    }
    setLoading(true);
    setError('');
    setPreview(null);
    try {
      const data = await api.getPreviewScreenshot(pageUrl);
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'スクリーンショットの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!preview) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    const x = Math.round((offsetX / rect.width) * preview.viewport.width);
    const y = Math.round((offsetY / rect.height) * preview.viewport.height);

    if (step.type === 'clickAt') {
      onChange({ x, y });
    } else if (step.type === 'dragAt') {
      if (dragMode === 'start') {
        onChange({ fromX: x, fromY: y });
      } else {
        onChange({ toX: x, toY: y });
      }
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={fetchPreview}
        disabled={loading}
        className="bg-emerald-600 text-white px-3 py-1 rounded text-sm hover:bg-emerald-500 disabled:opacity-50"
      >
        {loading ? '取得中...' : 'スクリーンショットを取得'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {preview && (
        <div className="space-y-2">
          {step.type === 'dragAt' && (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setDragMode('start')}
                className={`px-2 py-1 rounded text-sm ${dragMode === 'start' ? 'bg-emerald-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                開始点を設定
              </button>
              <button
                type="button"
                onClick={() => setDragMode('end')}
                className={`px-2 py-1 rounded text-sm ${dragMode === 'end' ? 'bg-emerald-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                終了点を設定
              </button>
              <span className="text-sm text-gray-600">
                次のクリック: {dragMode === 'start' ? '開始点' : '終了点'}
              </span>
            </div>
          )}
          <p className="text-sm text-gray-600">
            画像をクリックして座標を設定（{preview.viewport.width}x{preview.viewport.height}）
          </p>
          <img
            src={`data:image/png;base64,${preview.screenshot}`}
            alt="preview"
            onClick={handleImageClick}
            className="max-w-full border cursor-crosshair"
          />
        </div>
      )}
    </div>
  );
}
