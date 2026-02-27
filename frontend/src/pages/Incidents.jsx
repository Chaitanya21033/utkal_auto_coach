import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import PriorityBadge from '../components/PriorityBadge';
import StatusBadge from '../components/StatusBadge';
import api from '../api/client';

const INCIDENT_TYPES = [
  { value: 'safety',    label: 'Safety' },
  { value: 'near_miss', label: 'Near Miss' },
  { value: 'hazard',    label: 'Hazard' },
  { value: 'injury',    label: 'Injury' },
];
const SEVERITIES = ['HIGH', 'MED', 'LOW'];

export default function Incidents() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', incident_type: 'safety', stage: '', severity: 'MED' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadIncidents(); }, []);

  async function loadIncidents() {
    setLoading(true);
    try {
      const res = await api.get('/incidents');
      setIncidents(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleSubmit() {
    if (!form.title) { setError('Title is required'); return; }
    setSaving(true);
    try {
      await api.post('/incidents', form);
      setShowForm(false);
      setForm({ title: '', description: '', incident_type: 'safety', stage: '', severity: 'MED' });
      await loadIncidents();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to report incident');
    } finally { setSaving(false); }
  }

  // Maintenance link for maintenance role
  const showMaintLink = ['maintenance', 'line_manager', 'admin'].includes(user?.role);

  return (
    <div className="flex flex-col min-h-screen bg-app-bg pb-20">
      <Header title="Incidents" subtitle="Safety + Maintenance" />

      {/* Maintenance shortcut */}
      {showMaintLink && (
        <div className="mx-4 mb-4 flex gap-2">
          <button onClick={() => navigate('/incidents/maintenance')}
            className="flex-1 bg-app-card rounded-2xl p-3 text-left btn-press border border-red-900">
            <p className="text-red-400 font-semibold text-sm">Maintenance</p>
            <p className="text-app-muted text-xs">Tickets + PM</p>
          </button>
          <button onClick={() => navigate('/incidents/create-ticket')}
            className="flex-1 bg-app-card rounded-2xl p-3 text-left btn-press border border-app-border">
            <p className="text-white font-semibold text-sm">+ Create Ticket</p>
            <p className="text-app-muted text-xs">New issue</p>
          </button>
        </div>
      )}

      {/* Safety incidents */}
      <div className="mx-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-white font-semibold">Safety Incidents</h3>
          <button onClick={() => setShowForm(!showForm)} className="text-app-accent text-sm">+ Report</button>
        </div>

        {showForm && (
          <div className="bg-app-card rounded-2xl p-4 mb-3">
            <label className="block mb-3">
              <span className="text-app-muted text-xs">Title *</span>
              <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full bg-app-input text-white rounded-xl px-3 py-2 text-sm mt-1"
                placeholder="e.g. Chemical Spill" />
            </label>
            <div className="mb-3">
              <span className="text-app-muted text-xs">Type</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {INCIDENT_TYPES.map(t => (
                  <button key={t.value} onClick={() => setForm(f => ({ ...f, incident_type: t.value }))}
                    className={`px-3 py-1 rounded-lg text-xs font-medium btn-press
                      ${form.incident_type === t.value ? 'bg-app-accent text-black' : 'bg-app-input text-white'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-3">
              <span className="text-app-muted text-xs">Severity</span>
              <div className="flex gap-2 mt-1">
                {SEVERITIES.map(s => (
                  <button key={s} onClick={() => setForm(f => ({ ...f, severity: s }))}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold btn-press
                      ${form.severity === s
                        ? s === 'HIGH' ? 'bg-red-600 text-white' : s === 'MED' ? 'bg-yellow-500 text-black' : 'bg-green-500 text-black'
                        : 'bg-app-input text-app-muted'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <label className="block mb-3">
              <span className="text-app-muted text-xs">Stage / Location</span>
              <input type="text" value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}
                className="w-full bg-app-input text-white rounded-xl px-3 py-2 text-sm mt-1"
                placeholder="e.g. Paint Shop" />
            </label>
            <label className="block mb-3">
              <span className="text-app-muted text-xs">Description</span>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2} className="w-full bg-app-input text-white rounded-xl px-3 py-2 text-sm mt-1 resize-none"
                placeholder="Describe what happened..." />
            </label>
            {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)}
                className="flex-1 border border-app-border text-app-muted py-2 rounded-xl text-sm btn-press">Cancel</button>
              <button onClick={handleSubmit} disabled={saving}
                className="flex-1 bg-app-accent text-black font-bold py-2 rounded-xl text-sm btn-press disabled:opacity-50">
                {saving ? 'Saving...' : 'Report'}
              </button>
            </div>
          </div>
        )}

        {loading && <p className="text-app-muted text-sm py-4 text-center">Loading...</p>}
        <div className="flex flex-col gap-2">
          {incidents.map(inc => (
            <div key={inc.id} className="bg-app-card rounded-2xl p-4">
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={inc.severity} />
                  <span className="text-app-muted text-xs capitalize">{inc.incident_type.replace('_', ' ')}</span>
                </div>
                <StatusBadge status={inc.status} />
              </div>
              <p className="text-white font-semibold">{inc.title}</p>
              {inc.stage && <p className="text-app-muted text-xs">{inc.stage}</p>}
              {inc.description && <p className="text-app-muted text-xs mt-1">{inc.description}</p>}
              <p className="text-app-muted text-xs mt-2">{new Date(inc.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
            </div>
          ))}
          {!loading && incidents.length === 0 && (
            <p className="text-app-muted text-sm text-center py-8">No incidents reported</p>
          )}
        </div>
      </div>
    </div>
  );
}
