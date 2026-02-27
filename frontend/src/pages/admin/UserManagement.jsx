import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import api from '../../api/client';

const ROLES = ['line_manager','production','quality','maintenance','store','safety_hr','admin'];
const ROLE_LABELS = {
  line_manager: 'Line Manager', production: 'Production', quality: 'Quality',
  maintenance: 'Maintenance', store: 'Store', safety_hr: 'Safety/HR', admin: 'Admin/IT',
};
const ROLE_COLORS = {
  line_manager: 'bg-green-600', production: 'bg-yellow-500', quality: 'bg-blue-600',
  maintenance: 'bg-yellow-600', store: 'bg-green-700', safety_hr: 'bg-red-600', admin: 'bg-purple-600',
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', employee_id: '', pin: '', role: 'production' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleCreate() {
    if (!form.name || !form.employee_id || !form.pin) {
      setError('All fields required'); return;
    }
    setSaving(true);
    try {
      await api.post('/users', form);
      setShowForm(false);
      setForm({ name: '', employee_id: '', pin: '', role: 'production' });
      setError('');
      await loadUsers();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to create user');
    } finally { setSaving(false); }
  }

  async function toggleActive(user) {
    try {
      await api.patch(`/users/${user.id}`, { is_active: !user.is_active });
      await loadUsers();
    } catch (e) { console.error(e); }
  }

  return (
    <div className="flex flex-col min-h-screen bg-app-bg pb-20">
      <Header title="User Management" subtitle="Admin access control" back />

      {/* Add user button */}
      <div className="mx-4 mb-4">
        <button onClick={() => setShowForm(!showForm)}
          className="w-full bg-app-accent text-black font-bold py-3 rounded-2xl btn-press text-sm">
          {showForm ? 'Cancel' : '+ Add New User'}
        </button>
      </div>

      {/* Add user form */}
      {showForm && (
        <div className="mx-4 mb-4 bg-app-card rounded-2xl p-4">
          <label className="block mb-3">
            <span className="text-app-muted text-xs">Full Name *</span>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-app-input text-white rounded-xl px-3 py-2 text-sm mt-1" placeholder="Ravi Kumar" />
          </label>
          <label className="block mb-3">
            <span className="text-app-muted text-xs">Employee ID *</span>
            <input type="text" value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value.toUpperCase() }))}
              className="w-full bg-app-input text-white rounded-xl px-3 py-2 text-sm mt-1" placeholder="LM001" />
          </label>
          <label className="block mb-3">
            <span className="text-app-muted text-xs">PIN (4 digits) *</span>
            <input type="password" value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value }))}
              maxLength={4}
              className="w-full bg-app-input text-white rounded-xl px-3 py-2 text-sm mt-1" placeholder="••••" />
          </label>
          <div className="mb-3">
            <span className="text-app-muted text-xs">Role *</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {ROLES.map(r => (
                <button key={r} onClick={() => setForm(f => ({ ...f, role: r }))}
                  className={`px-3 py-1 rounded-lg text-xs font-medium btn-press
                    ${form.role === r ? `${ROLE_COLORS[r]} text-white` : 'bg-app-input text-app-muted'}`}>
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
          <button onClick={handleCreate} disabled={saving}
            className="w-full bg-app-accent text-black font-bold py-3 rounded-xl btn-press disabled:opacity-50">
            {saving ? 'Creating...' : 'Create User'}
          </button>
        </div>
      )}

      {/* Users list */}
      <div className="mx-4 bg-app-card rounded-2xl p-4">
        <p className="text-app-muted text-xs mb-3">{users.length} users</p>
        {loading && <p className="text-app-muted text-sm text-center py-4">Loading...</p>}
        <div className="flex flex-col gap-2">
          {users.map(u => (
            <div key={u.id} className="bg-app-input rounded-xl p-3 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${ROLE_COLORS[u.role] || 'bg-gray-600'} flex items-center justify-center flex-shrink-0`}>
                <span className="text-white font-bold">{u.name[0]}</span>
              </div>
              <div className="flex-1">
                <p className="text-white font-medium text-sm">{u.name}</p>
                <p className="text-app-muted text-xs">{u.employee_id} · {ROLE_LABELS[u.role]}</p>
              </div>
              <button onClick={() => toggleActive(u)}
                className={`text-xs px-2 py-1 rounded-lg btn-press
                  ${u.is_active ? 'bg-green-800 text-green-400' : 'bg-red-900 text-red-400'}`}>
                {u.is_active ? 'Active' : 'Inactive'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
