import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import api from '../../api/client';

const TYPE_META = {
  electricity: { icon: '⚡', color: 'text-yellow-400', unit: 'kWh', bgColor: 'bg-yellow-900/30' },
  water:       { icon: '💧', color: 'text-blue-400',   unit: 'KL',  bgColor: 'bg-blue-900/30' },
};

export default function MeterList() {
  const navigate  = useNavigate();
  const [latest,  setLatest]  = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all'); // all | electricity | water

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [latestRes, histRes] = await Promise.all([
        api.get('/meters/latest'),
        api.get('/meters?limit=30'),
      ]);
      setLatest(latestRes.data);
      setHistory(histRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  const filtered = filter === 'all' ? history : history.filter(r => r.meter_type === filter);

  return (
    <div className="flex flex-col min-h-screen bg-app-bg pb-24">
      <Header title="Meter Readings" subtitle="Electricity + Water" back />

      {/* Latest readings summary */}
      {latest.length > 0 && (
        <div className="mx-4 mb-4 flex gap-3">
          {latest.map(m => {
            const meta = TYPE_META[m.meter_type] || {};
            return (
              <div key={`${m.meter_type}-${m.meter_id}`}
                className={`flex-1 ${meta.bgColor} border border-app-border rounded-2xl p-4`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span>{meta.icon}</span>
                  <span className="text-app-muted text-xs capitalize">{m.meter_type}</span>
                </div>
                <p className={`font-bold text-xl ${meta.color}`}>
                  {m.reading_value?.toLocaleString()}
                </p>
                <p className="text-app-muted text-xs">{meta.unit} · {m.meter_id}</p>
                {m.consumption_delta != null && (
                  <p className="text-app-muted text-xs mt-1">
                    Δ +{m.consumption_delta.toFixed(1)} {meta.unit}
                  </p>
                )}
                <p className="text-app-muted text-xs mt-0.5">
                  {new Date(m.recorded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* New reading button */}
      <div className="mx-4 mb-4">
        <button onClick={() => navigate('/log/meters/capture')}
          className="w-full bg-app-accent text-black font-bold py-4 rounded-2xl btn-press">
          + Record New Reading
        </button>
      </div>

      {/* Filter + history */}
      <div className="mx-4 mb-3 bg-app-card rounded-xl p-1 flex gap-1">
        {['all','electricity','water'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize btn-press
              ${filter === f ? 'bg-app-accent text-black' : 'text-app-muted'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="mx-4 bg-app-card rounded-2xl p-4">
        <p className="text-app-muted text-xs mb-3">Reading History</p>
        {loading && <p className="text-app-muted text-sm text-center py-4">Loading...</p>}
        <div className="flex flex-col gap-2">
          {filtered.map(r => {
            const meta = TYPE_META[r.meter_type] || {};
            return (
              <div key={r.id} className="bg-app-input rounded-xl p-3 flex items-center gap-3">
                <span className="text-xl">{meta.icon}</span>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <p className={`font-bold ${meta.color}`}>{r.reading_value?.toLocaleString()} {meta.unit}</p>
                    {r.consumption_delta != null && (
                      <span className="text-xs text-green-400">+{r.consumption_delta.toFixed(1)}</span>
                    )}
                  </div>
                  <p className="text-app-muted text-xs">{r.meter_id} · {r.recorded_by_name}</p>
                  <p className="text-app-muted text-xs">
                    {new Date(r.recorded_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                  {r.ocr_raw && <p className="text-app-muted text-xs italic">OCR: "{r.ocr_raw?.slice(0, 30)}"</p>}
                </div>
              </div>
            );
          })}
          {!loading && filtered.length === 0 && (
            <p className="text-app-muted text-sm text-center py-4">No readings yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
