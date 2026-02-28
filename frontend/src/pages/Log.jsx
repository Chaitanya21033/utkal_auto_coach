import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';

const ROLE_LOG_OPTIONS = {
  quality:      [
    { label: 'Quality Gates',  desc: '4 gates workflow',          path: '/log/quality',     color: 'bg-blue-600',   icon: '✅' },
  ],
  production:   [
    { label: 'Quality Gates',  desc: 'Log gate checks',           path: '/log/quality',     color: 'bg-blue-600',   icon: '✅' },
  ],
  store:        [
    { label: 'Work Orders',    desc: 'Issue materials',           path: '/log/store',       color: 'bg-green-600',  icon: '📋' },
    { label: 'Scrap Log',      desc: 'Log + dispatch scrap',      path: '/log/scrap',       color: 'bg-yellow-600', icon: '♻️' },
  ],
  line_manager: [
    { label: 'Production Log', desc: 'Daily stage unit snapshot', path: '/log/production',  color: 'bg-orange-600', icon: '🏭' },
    { label: 'Meter Readings', desc: 'Electricity & water OCR',   path: '/log/meters',      color: 'bg-teal-600',   icon: '⚡' },
    { label: 'Quality Gates',  desc: 'Gate oversight',            path: '/log/quality',     color: 'bg-blue-600',   icon: '✅' },
    { label: 'Work Orders',    desc: 'Store oversight',           path: '/log/store',       color: 'bg-green-600',  icon: '📋' },
    { label: 'Scrap Log',      desc: 'Scrap dispatch',            path: '/log/scrap',       color: 'bg-yellow-600', icon: '♻️' },
  ],
  safety_hr: [
    { label: 'Meter Readings', desc: 'Utility consumption track', path: '/log/meters',      color: 'bg-teal-600',   icon: '⚡' },
  ],
  admin: [
    { label: 'Production Log', desc: 'All daily logs',            path: '/log/production',  color: 'bg-orange-600', icon: '🏭' },
    { label: 'Meter Readings', desc: 'All meters',                path: '/log/meters',      color: 'bg-teal-600',   icon: '⚡' },
    { label: 'Quality Gates',  desc: 'All gates',                 path: '/log/quality',     color: 'bg-blue-600',   icon: '✅' },
    { label: 'Work Orders',    desc: 'All WOs',                   path: '/log/store',       color: 'bg-green-600',  icon: '📋' },
    { label: 'Scrap Log',      desc: 'All scrap',                 path: '/log/scrap',       color: 'bg-yellow-600', icon: '♻️' },
  ],
};

export default function Log() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const options = ROLE_LOG_OPTIONS[user?.role] || [];

  return (
    <div className="flex flex-col min-h-screen bg-app-bg pb-20">
      <Header title="Log" subtitle="Record + Submit" />

      <div className="mx-4">
        {options.length === 0 && (
          <div className="bg-app-card rounded-2xl p-8 text-center">
            <p className="text-app-muted">No log modules available for your role</p>
          </div>
        )}
        <div className="flex flex-col gap-3">
          {options.map(opt => (
            <button key={opt.path} onClick={() => navigate(opt.path)}
              className="bg-app-card rounded-2xl p-5 text-left btn-press">
              <div className={`w-10 h-10 ${opt.color} rounded-xl flex items-center justify-center mb-3`}>
                <span className="text-white font-bold text-lg">{opt.label[0]}</span>
              </div>
              <h3 className="text-white font-bold text-lg">{opt.label}</h3>
              <p className="text-app-muted text-sm mt-0.5">{opt.desc}</p>
              <div className="mt-3 flex items-center text-app-accent text-sm font-medium">
                <span>Open</span>
                <span className="ml-1">&rsaquo;</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
