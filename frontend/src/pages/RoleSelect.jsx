import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_CONFIG = {
  line_manager: { label: 'Line Manager', color: 'bg-green-500', textColor: 'text-green-400' },
  production:   { label: 'Production',   color: 'bg-yellow-400', textColor: 'text-yellow-400' },
  quality:      { label: 'Quality',      color: 'bg-blue-500',  textColor: 'text-blue-400' },
  maintenance:  { label: 'Maintenance',  color: 'bg-yellow-500', textColor: 'text-yellow-400' },
  store:        { label: 'Store',        color: 'bg-green-500', textColor: 'text-green-400' },
  safety_hr:    { label: 'Safety/HR',    color: 'bg-red-500',   textColor: 'text-red-400' },
  admin:        { label: 'Admin/IT',     color: 'bg-gray-500',  textColor: 'text-gray-400' },
};

export default function RoleSelect() {
  const { user, shift } = useAuth();
  const navigate = useNavigate();

  const userRole = user?.role;
  const config = ROLE_CONFIG[userRole] || ROLE_CONFIG.admin;

  function handleSelect(role) {
    if (role !== userRole && userRole !== 'admin') return;
    navigate('/shift-stage');
  }

  return (
    <div className="flex flex-col min-h-screen bg-app-bg">
      {/* Header */}
      <div className="px-4 pt-8 pb-4 flex justify-between items-start">
        <div>
          <h1 className="text-white font-bold text-2xl">Select Role</h1>
          <p className="text-app-muted text-sm mt-1">Welcome, {user?.name}</p>
        </div>
        <span className="border border-app-border text-app-muted text-xs px-3 py-1 rounded-full">
          {shift ? `Shift ${shift.shift_type}` : 'Shift: Not set'}
        </span>
      </div>

      {/* Role Grid */}
      <div className="px-4 grid grid-cols-2 gap-3 flex-1">
        {Object.entries(ROLE_CONFIG).map(([role, cfg]) => {
          const isUserRole = role === userRole;
          const canAccess = isUserRole || userRole === 'admin';
          return (
            <button key={role}
              onClick={() => handleSelect(role)}
              className={`bg-app-card rounded-2xl p-4 text-left transition-all btn-press
                ${canAccess ? 'opacity-100' : 'opacity-30 cursor-not-allowed'}
                ${isUserRole ? 'ring-2 ring-app-accent' : ''}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl ${cfg.color} flex items-center justify-center`}>
                  <span className="text-white font-bold text-lg">{cfg.label[0]}</span>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{cfg.label}</p>
                  <p className="text-app-muted text-xs">{canAccess ? 'Tap to continue' : 'No access'}</p>
                </div>
              </div>
              <div className={`h-1 rounded-full ${cfg.color} ${canAccess ? '' : 'opacity-50'}`} style={{ width: isUserRole ? '60%' : '40%' }} />
            </button>
          );
        })}
      </div>

      {/* Quick continue if shift is already active */}
      {shift && (
        <div className="px-4 pb-6 pt-4">
          <button onClick={() => navigate('/home')}
            className="w-full bg-app-accent text-black font-bold py-4 rounded-2xl btn-press">
            CONTINUE SHIFT {shift.shift_type} — {shift.stage}
          </button>
        </div>
      )}

      {/* Bottom Nav placeholder */}
      <div className="h-16 border-t border-app-border flex items-center justify-around text-app-muted text-xs">
        <span>Home</span><span>Log</span><span>Incidents</span><span>Tasks</span>
        <span className="text-app-accent font-semibold">Profile</span>
      </div>
    </div>
  );
}
