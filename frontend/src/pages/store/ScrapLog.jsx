import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import StatusBadge from '../../components/StatusBadge';
import api from '../../api/client';

const SCRAP_TYPES = ['MS Scrap', 'SS Scrap', 'Mixed', 'Hazardous'];

export default function ScrapLog() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ scrap_type: 'MS Scrap', estimated_weight: '', yard: 'Yard-1' });
  const [saving, setSaving] = useState(false);
  const [dispatching, setDispatching] = useState(null);

  useEffect(() => { loadLogs(); }, []);

  async function loadLogs() {
    try {
      const res = await api.get('/scrap');
      setLogs(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleAdd() {
    setSaving(true);
    try {
      await api.post('/scrap', form);
      setShowForm(false);
      setForm({ scrap_type: 'MS Scrap', estimated_weight: '', yard: 'Yard-1' });
      await loadLogs();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function handleDispatch(id) {
    setDispatching(id);
    try {
      await api.patch(`/scrap/${id}/dispatch`);
      await loadLogs();
    } catch (e) { console.error(e); }
    finally { setDispatching(null); }
  }

  return (
    <div className="flex flex-col min-h-screen bg-app-bg pb-20">
      <Header title="Scrap" subtitle="Log + Dispatch" badge="Today" back />

      {/* Quick add types */}
      <div className="mx-4 mb-4 bg-app-card rounded-2xl p-4">
        <p className="text-app-muted text-xs mb-2">Quick Add</p>
        <div className="flex flex-wrap gap-2">
          {SCRAP_TYPES.map(type => (
            <button key={type}
              onClick={() => { setForm(f => ({ ...f, scrap_type: type })); setShowForm(true); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium btn-press
                ${form.scrap_type === type && showForm ? 'bg-app-accent text-black' : 'bg-app-input text-white'}`}>
              {type}
            </button>
          ))}
        </div>

        {showForm && (
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <p className="text-app-muted text-xs mb-1">Est. Weight (kg)</p>
                <input type="number" value={form.estimated_weight}
                  onChange={e => setForm(f => ({ ...f, estimated_weight: e.target.value }))}
                  className="w-full bg-app-input text-white rounded-xl px-3 py-2 text-sm"
                  placeholder="e.g. 120" />
              </div>
              <div className="flex-1">
                <p className="text-app-muted text-xs mb-1">Yard</p>
                <select value={form.yard} onChange={e => setForm(f => ({ ...f, yard: e.target.value }))}
                  className="w-full bg-app-input text-white rounded-xl px-3 py-2 text-sm">
                  <option>Yard-1</option>
                  <option>Yard-2</option>
                  <option>Yard-3</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)}
                className="flex-1 border border-app-border text-app-muted py-2 rounded-xl text-sm btn-press">
                Cancel
              </button>
              <button onClick={handleAdd} disabled={saving}
                className="flex-1 bg-app-accent text-black font-bold py-2 rounded-xl text-sm btn-press disabled:opacity-50">
                {saving ? 'Adding...' : 'Add Entry'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Recent entries */}
      <div className="mx-4 bg-app-card rounded-2xl p-4 mb-4">
        <p className="text-app-muted text-xs mb-3">Recent Entries</p>
        {loading && <p className="text-app-muted text-sm text-center py-4">Loading...</p>}
        <div className="flex flex-col gap-2">
          {logs.map(log => (
            <div key={log.id} className="bg-app-input rounded-xl p-3 flex justify-between items-center">
              <div>
                <p className="text-white font-semibold text-sm">{log.scrap_type}</p>
                <p className="text-app-muted text-xs">Est. {log.estimated_weight} kg · {log.yard}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={log.status} />
                {log.status === 'pending' && (
                  <button onClick={() => handleDispatch(log.id)} disabled={dispatching === log.id}
                    className="text-xs text-app-accent underline">
                    Dispatch
                  </button>
                )}
              </div>
            </div>
          ))}
          {!loading && logs.length === 0 && <p className="text-app-muted text-sm text-center py-4">No entries yet</p>}
        </div>
      </div>

      {/* Dispatch all pending */}
      <div className="px-4">
        <button onClick={() => {
          const pending = logs.filter(l => l.status === 'pending');
          Promise.all(pending.map(l => handleDispatch(l.id))).then(loadLogs);
        }}
          className="w-full bg-app-accent text-black font-bold text-lg py-4 rounded-2xl btn-press">
          DISPATCH SCRAP
        </button>
      </div>
    </div>
  );
}
