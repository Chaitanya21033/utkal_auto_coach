import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import api from '../../api/client';

const DEFAULT_MATERIALS = [
  { name: 'Paint (L)', unit: 'L', qty: '' },
  { name: 'MIG Wire (kg)', unit: 'kg', qty: '' },
  { name: 'Argon (cyl)', unit: 'cyl', qty: '' },
  { name: 'CO2 (cyl)', unit: 'cyl', qty: '' },
  { name: 'Consumables', unit: 'pcs', qty: '' },
];

export default function IssueMaterial() {
  const { woNumber } = useParams();
  const navigate = useNavigate();
  const [wo, setWo] = useState(null);
  const [materials, setMaterials] = useState(DEFAULT_MATERIALS.map(m => ({ ...m })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/store/work-orders/${woNumber}`)
      .then(res => setWo(res.data))
      .catch(() => setError('Work order not found'));
  }, [woNumber]);

  function updateQty(i, val) {
    setMaterials(prev => prev.map((m, idx) => idx === i ? { ...m, qty: val } : m));
  }

  function addMaterial() {
    setMaterials(prev => [...prev, { name: '', unit: 'pcs', qty: '' }]);
  }

  function updateName(i, val) {
    setMaterials(prev => prev.map((m, idx) => idx === i ? { ...m, name: val } : m));
  }

  async function handleSave() {
    const issued = materials.filter(m => m.qty && Number(m.qty) > 0 && m.name);
    if (issued.length === 0) { setError('Enter at least one material quantity'); return; }
    setSaving(true);
    try {
      await api.post('/store/issues', {
        work_order_id: wo?.id,
        work_order_no: woNumber,
        materials: issued.map(m => ({ name: m.name, quantity: Number(m.qty), unit: m.unit })),
      });
      navigate('/log/store');
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to save issue');
    } finally { setSaving(false); }
  }

  return (
    <div className="flex flex-col min-h-screen bg-app-bg pb-20">
      <Header title="Issue Material" subtitle="Store Issue → Emissions proxy" badge={woNumber} back />

      {/* WO summary */}
      {wo && (
        <div className="mx-4 mb-4 bg-app-card rounded-2xl p-4">
          <p className="text-white font-semibold">Work Order: {wo.wo_number}</p>
          <p className="text-app-muted text-xs mt-1">{wo.customer} · Consumed same-day: ON</p>
        </div>
      )}

      {/* Materials */}
      <div className="mx-4 bg-app-card rounded-2xl p-4 mb-4">
        <p className="text-app-muted text-xs mb-3">Materials</p>
        <div className="flex flex-col gap-3">
          {materials.map((mat, i) => (
            <div key={i} className="flex items-center gap-3">
              <input type="text" value={mat.name} onChange={e => updateName(i, e.target.value)}
                className="flex-1 bg-app-input text-white rounded-xl px-3 py-3 text-sm"
                placeholder="Material name" />
              <input type="number" value={mat.qty} onChange={e => updateQty(i, e.target.value)}
                className="w-20 bg-app-input text-white rounded-xl px-3 py-3 text-sm text-center"
                placeholder="—" min="0" step="0.5" />
            </div>
          ))}
        </div>
        <button onClick={addMaterial}
          className="w-full mt-3 border border-dashed border-app-border text-app-muted py-2 rounded-xl text-sm btn-press">
          + Add Material
        </button>
      </div>

      {error && <p className="text-red-400 text-sm px-4 mb-2">{error}</p>}

      <div className="px-4">
        <button onClick={handleSave} disabled={saving}
          className="w-full bg-app-accent text-black font-bold text-lg py-4 rounded-2xl btn-press disabled:opacity-50">
          {saving ? 'SAVING...' : 'SAVE ISSUE'}
        </button>
      </div>
    </div>
  );
}
