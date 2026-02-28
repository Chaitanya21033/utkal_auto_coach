import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import api from '../../api/client';

const STAGES = [
  { key: 'CKD',            label: 'CKD',            icon: '🔩', color: 'bg-blue-900' },
  { key: 'Shot Blasting',  label: 'Shot Blasting',  icon: '💨', color: 'bg-purple-900' },
  { key: 'Welding',        label: 'Welding',         icon: '🔥', color: 'bg-orange-900' },
  { key: 'Paint Shop',     label: 'Paint Shop',      icon: '🎨', color: 'bg-pink-900' },
  { key: 'Final Assembly', label: 'Final Assembly',  icon: '🔧', color: 'bg-green-900' },
  { key: 'Finished Goods', label: 'Finished Goods',  icon: '📦', color: 'bg-teal-900' },
];

export default function ProductionLog() {
  const { shift } = useAuth();
  const navigate  = useNavigate();

  const [logDate,    setLogDate]    = useState(new Date().toISOString().split('T')[0]);
  const [shiftType,  setShiftType]  = useState(shift?.shift_type || 'A');
  const [units,      setUnits]      = useState(() => Object.fromEntries(STAGES.map(s => [s.key, ''])));
  const [wasteKg,    setWasteKg]    = useState('');
  const [notes,      setNotes]      = useState('');
  const [preview,    setPreview]    = useState(null);
  const [prevLog,    setPrevLog]    = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [error,      setError]      = useState('');

  // Load today's existing log if any
  useEffect(() => {
    api.get('/production-log/today')
      .then(res => { if (res.data.length) setPrevLog(res.data[0]); })
      .catch(() => {});
  }, []);

  // Live emission preview whenever units change
  useEffect(() => {
    const entries = buildEntries();
    if (entries.some(e => e.units_in_stage > 0)) {
      api.post('/production-log/emission-preview', { stage_entries: entries })
        .then(res => setPreview(res.data))
        .catch(() => {});
    } else {
      setPreview(null);
    }
  }, [units]);

  function buildEntries() {
    return STAGES.map(s => ({
      stage: s.key,
      units_in_stage: Number(units[s.key]) || 0,
    }));
  }

  async function handleSubmit() {
    const entries = buildEntries();
    if (entries.every(e => e.units_in_stage === 0)) {
      setError('Enter at least one unit count');
      return;
    }
    setSaving(true);
    try {
      await api.post('/production-log', {
        log_date:     logDate,
        shift_type:   shiftType,
        stage_entries: entries,
        waste_kg:     Number(wasteKg) || 0,
        notes,
      });
      setSaved(true);
      setTimeout(() => navigate('/home'), 1500);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to save log');
    } finally { setSaving(false); }
  }

  const totalUnits = Object.values(units).reduce((s, v) => s + (Number(v) || 0), 0);

  return (
    <div className="flex flex-col min-h-screen bg-app-bg pb-28">
      <Header title="Production Log" subtitle="End-of-day unit snapshot" back />

      {/* Date + Shift */}
      <div className="mx-4 mb-3 bg-app-card rounded-2xl p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-app-muted text-xs mb-1">Date</p>
            <input type="date" value={logDate}
              onChange={e => setLogDate(e.target.value)}
              className="w-full bg-app-input text-white rounded-xl px-3 py-2 text-sm" />
          </div>
          <div>
            <p className="text-app-muted text-xs mb-1">Shift</p>
            <div className="flex gap-1">
              {['A','B','C'].map(s => (
                <button key={s} onClick={() => setShiftType(s)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold btn-press
                    ${shiftType === s ? 'bg-app-accent text-black' : 'bg-app-input text-white'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Previous log notice */}
      {prevLog && (
        <div className="mx-4 mb-3 border border-yellow-700 bg-yellow-900/20 rounded-2xl p-3">
          <p className="text-yellow-400 text-xs font-semibold">Today's log already submitted at {new Date(prevLog.logged_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
          <p className="text-app-muted text-xs mt-0.5">Submitting again will add a new entry for this shift</p>
        </div>
      )}

      {/* Stage unit counts */}
      <div className="mx-4 mb-3 bg-app-card rounded-2xl p-4">
        <div className="flex justify-between items-center mb-3">
          <p className="text-white font-semibold">Units in Each Stage</p>
          <span className="text-app-accent text-sm font-bold">{totalUnits} total</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {STAGES.map(s => (
            <div key={s.key} className={`${s.color} rounded-xl p-3`}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-base">{s.icon}</span>
                <span className="text-white text-xs font-medium">{s.label}</span>
              </div>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={units[s.key]}
                onChange={e => setUnits(u => ({ ...u, [s.key]: e.target.value }))}
                className="w-full bg-black/30 text-white rounded-lg px-3 py-2 text-lg font-bold text-center"
                placeholder="0"
              />
              <p className="text-white/50 text-xs text-center mt-1">units</p>
            </div>
          ))}
        </div>
      </div>

      {/* Waste */}
      <div className="mx-4 mb-3 bg-app-card rounded-2xl p-4">
        <p className="text-app-muted text-xs mb-1">Waste / Scrap Generated Today (kg)</p>
        <input type="number" inputMode="decimal" min="0" value={wasteKg}
          onChange={e => setWasteKg(e.target.value)}
          className="w-full bg-app-input text-white rounded-xl px-4 py-3 text-lg font-mono"
          placeholder="e.g. 150" />
        <p className="text-app-muted text-xs mb-2 mt-3">Notes</p>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          rows={2} className="w-full bg-app-input text-white rounded-xl px-3 py-2 text-sm resize-none"
          placeholder="Shift observations, delays, special notes..." />
      </div>

      {/* Live emission preview */}
      {preview && (
        <div className="mx-4 mb-3 bg-app-card rounded-2xl p-4">
          <p className="text-app-muted text-xs mb-2">Estimated Emissions for this Log</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-yellow-900/30 rounded-xl p-2">
              <p className="text-yellow-400 font-bold text-lg">{preview.est_electricity_kwh}</p>
              <p className="text-app-muted text-xs">kWh</p>
            </div>
            <div className="bg-blue-900/30 rounded-xl p-2">
              <p className="text-blue-400 font-bold text-lg">{preview.est_water_kl}</p>
              <p className="text-app-muted text-xs">KL water</p>
            </div>
            <div className="bg-red-900/30 rounded-xl p-2">
              <p className="text-red-400 font-bold text-lg">{preview.direct_co2_kg}</p>
              <p className="text-app-muted text-xs">kg CO₂</p>
            </div>
          </div>
          <p className="text-app-muted text-xs text-center mt-2">
            Total CO₂e: <span className="text-white font-semibold">{preview.total_co2_kg} kg</span>
            {' '}(incl. grid electricity)
          </p>
        </div>
      )}

      {error && <p className="text-red-400 text-sm px-4 mb-2">{error}</p>}

      {saved ? (
        <div className="mx-4 bg-green-900/30 border border-green-600 rounded-2xl p-4 text-center">
          <p className="text-green-400 font-semibold">Log Submitted! ESG dashboard updated.</p>
        </div>
      ) : (
        <div className="px-4">
          <button onClick={handleSubmit} disabled={saving}
            className="w-full bg-app-accent text-black font-bold text-lg py-4 rounded-2xl btn-press disabled:opacity-50">
            {saving ? 'SAVING...' : 'SUBMIT DAILY LOG'}
          </button>
        </div>
      )}
    </div>
  );
}
