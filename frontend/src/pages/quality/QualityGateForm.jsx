import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import api from '../../api/client';

export default function QualityGateForm() {
  const { gateType } = useParams();
  const navigate = useNavigate();
  const [meta, setMeta] = useState(null);
  const [workOrderNo, setWorkOrderNo] = useState('');
  const [model, setModel] = useState('');
  const [variant, setVariant] = useState('');
  const [checked, setChecked] = useState({});
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/quality/gate-meta/${gateType}`)
      .then(res => {
        setMeta(res.data);
        const init = {};
        res.data.items.forEach((_, i) => { init[i] = false; });
        setChecked(init);
      })
      .catch(() => setError('Gate not found'));
  }, [gateType]);

  async function handleResult(result) {
    if (!workOrderNo) { setError('Work order number is required'); return; }
    const checklist_items = (meta?.items || []).map((item, i) => ({ label: item, completed: !!checked[i] }));
    setSaving(true);
    try {
      await api.post('/quality/gates', {
        gate_type: gateType,
        work_order_no: workOrderNo,
        model,
        variant,
        checklist_items,
        result,
        notes,
      });
      navigate('/log/quality');
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to submit');
    } finally { setSaving(false); }
  }

  if (!meta && !error) return <div className="flex items-center justify-center h-screen bg-app-bg"><p className="text-app-muted">Loading...</p></div>;
  if (error && !meta) return <div className="flex items-center justify-center h-screen bg-app-bg"><p className="text-red-400">{error}</p></div>;

  const checkedCount = Object.values(checked).filter(Boolean).length;
  const minItems = meta?.items?.length || 6;

  return (
    <div className="flex flex-col min-h-screen bg-app-bg pb-28">
      <Header title="Gate Form" subtitle={`${meta?.label} checklist`} badge={workOrderNo || 'No WO'} back />

      {/* Work order info */}
      <div className="mx-4 mb-4 bg-app-card rounded-2xl p-4">
        <p className="text-white font-semibold mb-3">{meta?.label} — Vehicle Offer</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-app-muted text-xs mb-1">Work Order # *</p>
            <input type="text" value={workOrderNo} onChange={e => setWorkOrderNo(e.target.value)}
              className="w-full bg-app-input text-white rounded-xl px-3 py-2 text-sm"
              placeholder="e.g. WO-1832" />
          </div>
          <div>
            <p className="text-app-muted text-xs mb-1">Model</p>
            <input type="text" value={model} onChange={e => setModel(e.target.value)}
              className="w-full bg-app-input text-white rounded-xl px-3 py-2 text-sm"
              placeholder="e.g. Tipper Body" />
          </div>
          <div className="col-span-2">
            <p className="text-app-muted text-xs mb-1">Variant</p>
            <input type="text" value={variant} onChange={e => setVariant(e.target.value)}
              className="w-full bg-app-input text-white rounded-xl px-3 py-2 text-sm"
              placeholder="e.g. BB/ERC" />
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="mx-4 bg-app-card rounded-2xl p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <p className="text-app-muted text-xs">Checklist (min {minItems} items)</p>
          <span className="text-app-muted text-xs">{checkedCount}/{meta?.items?.length}</span>
        </div>
        <div className="flex flex-col gap-2">
          {(meta?.items || []).map((item, i) => (
            <label key={i}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors
                ${checked[i] ? 'bg-green-900/20' : 'bg-app-input'}`}>
              <input type="checkbox"
                checked={!!checked[i]}
                onChange={e => setChecked(c => ({ ...c, [i]: e.target.checked }))}
                className="flex-shrink-0"
              />
              <span className={`text-sm ${checked[i] ? 'text-green-400' : 'text-white'}`}>
                {item}
              </span>
            </label>
          ))}
        </div>
        <div className="mt-3">
          <p className="text-app-muted text-xs mb-1">Notes</p>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            rows={2} className="w-full bg-app-input text-white rounded-xl px-3 py-2 text-sm resize-none"
            placeholder="Optional remarks..." />
        </div>
      </div>

      {error && <p className="text-red-400 text-sm px-4 mb-2">{error}</p>}

      {/* Pass / Hold buttons */}
      <div className="px-4 flex gap-3">
        <button onClick={() => handleResult('pass')} disabled={saving}
          className="flex-1 bg-green-500 text-black font-bold text-lg py-4 rounded-2xl btn-press disabled:opacity-50">
          PASS
        </button>
        <button onClick={() => handleResult('hold')} disabled={saving}
          className="flex-1 bg-red-500 text-white font-bold text-lg py-4 rounded-2xl btn-press disabled:opacity-50">
          HOLD / REWORK
        </button>
      </div>
    </div>
  );
}
