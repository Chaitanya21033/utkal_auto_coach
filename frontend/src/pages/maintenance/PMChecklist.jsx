import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import api from '../../api/client';

const GROUPS = ['Compressors', 'Paint Booth', 'Welders', 'Lathe', 'PS Grind'];

export default function PMChecklist() {
  const { group } = useParams();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(group ? decodeURIComponent(group) : GROUPS[0]);
  const [items, setItems] = useState([]);
  const [checked, setChecked] = useState({});
  const [dueCount, setDueCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadPM(selected);
  }, [selected]);

  async function loadPM(grp) {
    try {
      const res = await api.get(`/maintenance/pm?machine_group=${encodeURIComponent(grp)}`);
      setItems(res.data.items || []);
      const initChecked = {};
      (res.data.items || []).forEach((item, i) => { initChecked[i] = false; });
      setChecked(initChecked);
    } catch (e) { console.error(e); }
  }

  async function handleSubmit() {
    const allChecked = Object.values(checked).every(Boolean);
    if (!allChecked) {
      if (!window.confirm('Some items are unchecked. Submit anyway?')) return;
    }
    setSaving(true);
    try {
      const checklist_items = items.map((item, i) => ({ label: item, completed: !!checked[i] }));
      await api.post('/maintenance/pm', { machine_group: selected, checklist_items });
      setSaved(true);
      setTimeout(() => navigate('/incidents/maintenance'), 1500);
    } catch (e) {
      console.error(e);
    } finally { setSaving(false); }
  }

  const checkedCount = Object.values(checked).filter(Boolean).length;

  return (
    <div className="flex flex-col min-h-screen bg-app-bg pb-20">
      <Header title="Preventive Maintenance" subtitle="Monthly checklist" badge={`Due: ${dueCount}`} back />

      {/* Machine Group Selector */}
      <div className="mx-4 mb-4 bg-app-card rounded-2xl p-4">
        <p className="text-app-muted text-xs mb-2">Select Machine Group</p>
        <div className="flex flex-wrap gap-2">
          {GROUPS.map(g => (
            <button key={g} onClick={() => { setSelected(g); setSaved(false); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium btn-press
                ${selected === g ? 'bg-app-accent text-black' : 'bg-app-input text-white'}`}>
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Checklist */}
      <div className="mx-4 bg-app-card rounded-2xl p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-white font-semibold">{selected} PM — Checklist</h3>
          <span className="text-app-muted text-xs">{checkedCount}/{items.length}</span>
        </div>
        <div className="flex flex-col gap-2">
          {items.map((item, i) => (
            <label key={i}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors
                ${checked[i] ? 'bg-green-900/20' : 'bg-app-input'}`}>
              <input type="checkbox"
                checked={!!checked[i]}
                onChange={e => setChecked(c => ({ ...c, [i]: e.target.checked }))}
                className="flex-shrink-0"
              />
              <span className={`text-sm ${checked[i] ? 'text-green-400 line-through' : 'text-white'}`}>
                {item}
              </span>
            </label>
          ))}
        </div>
      </div>

      {saved && (
        <div className="mx-4 mb-4 bg-green-900/30 border border-green-600 rounded-2xl p-4 text-center">
          <p className="text-green-400 font-semibold">PM Submitted!</p>
        </div>
      )}

      <div className="px-4">
        <button onClick={handleSubmit} disabled={saving || saved}
          className="w-full bg-app-accent text-black font-bold text-lg py-4 rounded-2xl btn-press disabled:opacity-50">
          {saving ? 'SUBMITTING...' : saved ? 'SUBMITTED' : 'SUBMIT PM'}
        </button>
      </div>
    </div>
  );
}
