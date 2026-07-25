import { useEffect, useRef, useState } from 'react';
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
  const [scale, setScale] = useState(1);
  const [hover, setHover] = useState<{ x: number; y: number; rawX: number; rawY: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragStartRef = useRef<{ fromX: number; fromY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fitAppliedRef = useRef(false);
  const [containerWidth, setContainerWidth] = useState(0);

  const fetchPreview = async () => {
    if (!pageUrl) {
      setError('ページ URL を入力してください');
      return;
    }
    setLoading(true);
    setError('');
    setPreview(null);
    setImageLoaded(false);
    fitAppliedRef.current = false;
    try {
      const data = await api.getPreviewScreenshot(pageUrl);
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'スクリーンショットの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!preview) return;
    setImageLoaded(false);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = preview.viewport.width;
      canvas.height = preview.viewport.height;
    }
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
    img.src = `data:image/png;base64,${preview.screenshot}`;
    return () => {
      img.onload = null;
    };
  }, [preview]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && preview) {
      canvas.style.width = `${preview.viewport.width * scale}px`;
      canvas.style.height = `${preview.viewport.height * scale}px`;
      canvas.style.imageRendering = 'pixelated';
    }
  }, [scale, preview]);

  useEffect(() => {
    if (!preview || !containerRef.current) return;
    const el = containerRef.current;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(update);
      ro.observe(el);
    }
    window.addEventListener('resize', update);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [preview]);

  useEffect(() => {
    if (!preview || containerWidth === 0 || fitAppliedRef.current) return;
    const fit = Math.min(1, (containerWidth - 24) / preview.viewport.width);
    if (fit > 0) {
      setScale(Math.max(0.25, Math.round(fit * 100) / 100));
      fitAppliedRef.current = true;
    }
  }, [preview, containerWidth]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !preview || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawMarker = (x: number, y: number, color: string, label: string) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = color;
      ctx.fillText(label, x + 9, y - 9);
      ctx.restore();
    };

    const drawArrow = (x1: number, y1: number, x2: number, y2: number, color: string) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLen = 10;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // grid
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;
    for (let gx = 100; gx < preview.viewport.width; gx += 100) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, canvas.height);
      ctx.stroke();
    }
    for (let gy = 100; gy < preview.viewport.height; gy += 100) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(canvas.width, gy);
      ctx.stroke();
    }

    if (step.type === 'dragAt' && dragging && dragStartRef.current && hover) {
      drawArrow(dragStartRef.current.fromX, dragStartRef.current.fromY, hover.x, hover.y, 'rgba(59,130,246,0.8)');
      drawMarker(dragStartRef.current.fromX, dragStartRef.current.fromY, '#22c55e', '開始');
      drawMarker(hover.x, hover.y, '#3b82f6', '終了');
    } else if (step.type === 'clickAt') {
      const x = step.x ?? 0;
      const y = step.y ?? 0;
      if (x !== 0 || y !== 0) drawMarker(x, y, '#ef4444', 'クリック');
    } else if (step.type === 'dragAt') {
      const fromX = step.fromX ?? 0;
      const fromY = step.fromY ?? 0;
      const toX = step.toX ?? 0;
      const toY = step.toY ?? 0;
      if (fromX !== 0 || fromY !== 0 || toX !== 0 || toY !== 0) {
        drawArrow(fromX, fromY, toX, toY, 'rgba(59,130,246,0.8)');
        drawMarker(fromX, fromY, '#22c55e', '開始');
        drawMarker(toX, toY, '#3b82f6', '終了');
      }
    }

    if (hover) {
      ctx.save();
      ctx.strokeStyle = 'rgba(239,68,68,0.7)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(hover.x, 0);
      ctx.lineTo(hover.x, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, hover.y);
      ctx.lineTo(canvas.width, hover.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(239,68,68,0.9)';
      ctx.beginPath();
      ctx.arc(hover.x, hover.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }, [preview, imageLoaded, hover, scale, step, dragging]);

  const toModel = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !preview) return { x: 0, y: 0, rawX: 0, rawY: 0 };
    const rect = canvas.getBoundingClientRect();
    const rawX = clientX - rect.left;
    const rawY = clientY - rect.top;
    const x = Math.max(0, Math.min(preview.viewport.width, Math.round((rawX / rect.width) * preview.viewport.width)));
    const y = Math.max(0, Math.min(preview.viewport.height, Math.round((rawY / rect.height) * preview.viewport.height)));
    return { x, y, rawX, rawY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y, rawX, rawY } = toModel(e.clientX, e.clientY);
    setHover({ x, y, rawX, rawY });
  };

  const handleMouseLeave = () => {
    setHover(null);
    if (dragging) {
      setDragging(false);
      dragStartRef.current = null;
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (step.type !== 'dragAt') return;
    const { x, y, rawX, rawY } = toModel(e.clientX, e.clientY);
    setHover({ x, y, rawX, rawY });
    dragStartRef.current = { fromX: x, fromY: y };
    setDragging(true);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = toModel(e.clientX, e.clientY);
    if (step.type === 'clickAt') {
      onChange({ x, y });
    } else if (step.type === 'dragAt' && dragging && dragStartRef.current) {
      onChange({
        fromX: dragStartRef.current.fromX,
        fromY: dragStartRef.current.fromY,
        toX: x,
        toY: y,
      });
      setDragging(false);
      dragStartRef.current = null;
    }
  };

  const reset = () => {
    if (step.type === 'clickAt') {
      onChange({ x: 0, y: 0 });
    } else if (step.type === 'dragAt') {
      onChange({ fromX: 0, fromY: 0, toX: 0, toY: 0 });
      setDragging(false);
      dragStartRef.current = null;
    }
  };

  const scales = [0.75, 1, 1.5, 2];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={fetchPreview}
          disabled={loading}
          className="bg-emerald-600 text-white px-3 py-1 rounded text-sm hover:bg-emerald-500 disabled:opacity-50"
        >
          {loading ? '取得中...' : preview ? 'プレビュー再取得' : 'スクリーンショットを取得'}
        </button>
        {preview && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-600">拡大:</span>
            {scales.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScale(s)}
                className={`px-2 py-0.5 rounded text-xs ${scale === s ? 'bg-emerald-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                {Math.round(s * 100)}%
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                fitAppliedRef.current = true;
                const fit = preview ? Math.min(1, (containerWidth - 24) / preview.viewport.width) : 1;
                setScale(Math.max(0.25, Math.round(fit * 100) / 100));
              }}
              className="px-2 py-0.5 rounded text-xs bg-gray-200 hover:bg-gray-300"
            >
              全体表示
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {preview && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-700">
            <span>
              カーソル: <strong>{hover ? `(${hover.x}, ${hover.y})` : '-'}</strong>
            </span>
            {step.type === 'clickAt' && (
              <span>
                クリック位置: <strong>({step.x ?? 0}, {step.y ?? 0})</strong>
              </span>
            )}
            {step.type === 'dragAt' && (
              <span>
                ドラッグ: <strong>({step.fromX ?? 0}, {step.fromY ?? 0}) → ({step.toX ?? 0}, {step.toY ?? 0})</strong>
              </span>
            )}
          </div>

          <p className="text-xs text-gray-600">
            {step.type === 'dragAt'
              ? '画像上でドラッグ（開始点から終了点へ）してドラッグを指定'
              : '画像をクリックして座標を指定'}
            （{preview.viewport.width}x{preview.viewport.height}）
          </p>

          <div ref={containerRef} className="relative border rounded overflow-auto max-h-[80vh] bg-gray-50">
            <canvas
              ref={canvasRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              className="block cursor-crosshair"
            />
            {hover && (
              <div
                className="absolute pointer-events-none bg-black/80 text-white text-xs px-2 py-1 rounded z-10"
                style={{ left: hover.rawX + 10, top: hover.rawY - 24 }}
              >
                ({hover.x}, {hover.y})
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={reset}
            className="text-sm text-red-600 hover:underline"
          >
            座標をリセット
          </button>
        </div>
      )}
    </div>
  );
}
