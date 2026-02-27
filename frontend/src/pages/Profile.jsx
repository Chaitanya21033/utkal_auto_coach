import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';

const ROLE_LABELS = {
  line_manager: 'Line Manager',
  production: 'Production',
  quality: 'Quality',
  maintenance: 'Maintenance',
  store: 'Store',
  safety_hr: 'Safety/HR',
  admin: 'Admin/IT',
};

const ROLE_COLORS = {
  line_manager: 'bg-green-500',
  production: 'bg-yellow-500',
  quality: 'bg-blue-500',
  maintenance: 'bg-yellow-600',
  store: 'bg-green-600',
  safety_hr: 'bg-red-500',
  admin: 'bg-purple-500',
};

export default function Profile() {
  const { user, shift, logout, endShift } = useAuth();
  const navigate = useNavigate();
  const [confirmLogout, setConfirmLogout] = useState(false);

  async function handleLogout() {
    if (shift) await endShift().catch(() => {});
    logout();
    navigate('/login', { replace: true });
  }

  if (!user) return null;

  return (
    <div className="flex flex-col min-h-screen bg-app-bg pb-20">
      <Header title="Profile" subtitle="Account & settings" />

      {/* User card */}
      <div className="mx-4 mb-4 bg-app-card rounded-2xl p-5">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl ${ROLE_COLORS[user.role] || 'bg-gray-600'} flex items-center justify-center`}>
            <span className="text-white font-bold text-2xl">{user.name?.[0]?.toUpperCase()}</span>
          </div>
          <div>
            <h2 className="text-white font-bold text-xl">{user.name}</h2>
            <p className="text-app-muted text-sm">{user.employee_id}</p>
            <span className={`text-xs font-bold px-2 py-0.5 rounded mt-1 inline-block ${ROLE_COLORS[user.role] || 'bg-gray-600'} text-white`}>
              {ROLE_LABELS[user.role] || user.role}
            </span>
          </div>
        </div>
      </div>

      {/* Shift info */}
      <div className="mx-4 mb-4 bg-app-card rounded-2xl p-4">
        <p className="text-app-muted text-xs mb-2">Current Shift</p>
        {shift ? (
          <div className="flex justify-between items-center">
            <div>
              <p className="text-white font-semibold">Shift {shift.shift_type} — {shift.stage}</p>
              <p className="text-app-muted text-xs">Started {new Date(shift.start_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <button onClick={() => endShift().then(() => navigate('/shift-stage'))}
              className="text-xs text-red-400 border border-red-600 px-3 py-1.5 rounded-lg btn-press">
              End Shift
            </button>
          </div>
        ) : (
          <div className="flex justify-between items-center">
            <p className="text-app-muted text-sm">No active shift</p>
            <button onClick={() => navigate('/shift-stage')}
              className="text-xs text-app-accent border border-app-accent px-3 py-1.5 rounded-lg btn-press">
              Set Shift
            </button>
          </div>
        )}
      </div>

      {/* Admin section */}
      {user.role === 'admin' && (
        <div className="mx-4 mb-4 bg-app-card rounded-2xl p-4">
          <p className="text-app-muted text-xs mb-2">Administration</p>
          <button onClick={() => navigate('/admin/users')}
            className="w-full bg-app-input text-white py-3 px-4 rounded-xl text-sm text-left flex justify-between items-center btn-press">
            <span>Manage Users</span>
            <span className="text-app-muted">&rsaquo;</span>
          </button>
        </div>
      )}

      {/* App info */}
      <div className="mx-4 mb-4 bg-app-card rounded-2xl p-4">
        <p className="text-app-muted text-xs mb-2">App Info</p>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between"><span className="text-app-muted">Version</span><span className="text-white">v1.0.0</span></div>
          <div className="flex justify-between"><span className="text-app-muted">App</span><span className="text-white">Utkal Action Hub</span></div>
          <div className="flex justify-between"><span className="text-app-muted">Date</span><span className="text-white">{new Date().toLocaleDateString('en-IN')}</span></div>
        </div>
      </div>

      {/* Logout */}
      <div className="px-4">
        {!confirmLogout ? (
          <button onClick={() => setConfirmLogout(true)}
            className="w-full border border-red-600 text-red-400 font-semibold py-4 rounded-2xl btn-press">
            LOGOUT
          </button>
        ) : (
          <div className="bg-red-900/30 border border-red-600 rounded-2xl p-4">
            <p className="text-white text-center mb-3">End shift and logout?</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmLogout(false)}
                className="flex-1 border border-app-border text-app-muted py-3 rounded-xl btn-press">
                Cancel
              </button>
              <button onClick={handleLogout}
                className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl btn-press">
                Confirm
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
