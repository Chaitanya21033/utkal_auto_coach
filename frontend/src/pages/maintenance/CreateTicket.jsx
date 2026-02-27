import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import api from '../../api/client';

const STAGES = ['CKD', 'Shot Blasting', 'Welding', 'Paint Shop', 'Final Assembly'];
const PRIORITIES = ['HIGH', 'MED', 'LOW'];

export default function CreateTicket() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', priority: 'MED', stage: '', machine_id: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  async function handleSubmit() {
    if (!form.title || !form.stage || !form.machine_id) {
      setError('Title, stage and machine ID are required');
      return;
    }
    setSaving(true);
    try {
      await api.post('/maintenance/tickets', form);
      navigate('/incidents/maintenance');
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to create ticket');
    } finally { setSaving(false); }
  }

  return (
    <div className="flex flex-col min-h-screen bg-app-bg pb-20">
      <Header title="Create Ticket" subtitle="Report a new maintenance issue" back />

      <div className="mx-4 bg-app-card rounded-2xl p-4 mb-4">
        <label className="block mb-4">
          <span className="text-app-muted text-xs">Issue Title *</span>
          <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
            className="w-full bg-app-input text-white rounded-xl px-4 py-3 text-sm mt-1"
            placeholder="e.g. Hydraulic Leak" />
        </label>

        <div className="mb-4">
          <span className="text-app-muted text-xs">Priority *</span>
          <div className="flex gap-2 mt-1">
            {PRIORITIES.map(p => (
              <button key={p} onClick={() => set('priority', p)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold btn-press
                  ${form.priority === p
                    ? p === 'HIGH' ? 'bg-red-600 text-white' : p === 'MED' ? 'bg-yellow-500 text-black' : 'bg-green-500 text-black'
                    : 'bg-app-input text-app-muted'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <span className="text-app-muted text-xs">Stage *</span>
          <div className="flex flex-col gap-1.5 mt-1">
            {STAGES.map(s => (
              <button key={s} onClick={() => set('stage', s)}
                className={`w-full py-3 px-4 rounded-xl text-sm text-left btn-press
                  ${form.stage === s ? 'bg-app-accent text-black font-semibold' : 'bg-app-input text-white'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <label className="block mb-4">
          <span className="text-app-muted text-xs">Machine ID *</span>
          <input type="text" value={form.machine_id} onChange={e => set('machine_id', e.target.value)}
            className="w-full bg-app-input text-white rounded-xl px-4 py-3 text-sm mt-1"
            placeholder="e.g. HYD-02" />
        </label>

        <label className="block">
          <span className="text-app-muted text-xs">Description</span>
          <textarea value={form.description} onChange={e => set('description', e.target.value)}
            rows={3}
            className="w-full bg-app-input text-white rounded-xl px-4 py-3 text-sm mt-1 resize-none"
            placeholder="Describe the issue..." />
        </label>
      </div>

      {error && <p className="text-red-400 text-sm px-4 mb-2">{error}</p>}

      <div className="px-4">
        <button onClick={handleSubmit} disabled={saving}
          className="w-full bg-app-accent text-black font-bold text-lg py-4 rounded-2xl btn-press disabled:opacity-50">
          {saving ? 'CREATING...' : 'CREATE TICKET'}
        </button>
      </div>
    </div>
  );
}
