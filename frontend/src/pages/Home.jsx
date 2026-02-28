import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import api from '../api/client';

const ROLE_LABELS = {
  line_manager: 'Line Manager',
  production: 'Production',
  quality: 'Quality',
  maintenance: 'Maintenance',
  store: 'Store',
  safety_hr: 'Safety/HR',
  admin: 'Admin/IT',
};

export default function Home() {
  const { user, shift, endShift } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [user]);

  async function loadStats() {
    try {
      const [tasksRes] = await Promise.all([
        api.get('/tasks'),
      ]);
      setTasks(tasksRes.data.slice(0, 3));

      // Load role-specific stats
      if (['maintenance', 'line_manager', 'admin'].includes(user?.role)) {
        const ticketsRes = await api.get('/maintenance/tickets');
        const open = ticketsRes.data.filter(t => t.status === 'open' || t.status === 'in_progress');
        setStats(s => ({ ...s, openTickets: open.length, highTickets: open.filter(t => t.priority === 'HIGH').length }));
      }
      if (['quality', 'production', 'line_manager', 'admin'].includes(user?.role)) {
        const gatesRes = await api.get('/quality/gates');
        setStats(s => ({ ...s, gates: gatesRes.data }));
      }
      if (['store', 'line_manager', 'admin'].includes(user?.role)) {
        const woRes = await api.get('/store/work-orders');
        const scrapRes = await api.get('/scrap');
        setStats(s => ({
          ...s,
          openOrders: woRes.data.length,
          pendingScrap: scrapRes.data.filter(sl => sl.status === 'pending').length
        }));
      }
    } catch (e) {
      console.error('Failed to load stats', e);
    } finally {
      setLoading(false);
    }
  }

  const role = user?.role;

  return (
    <div className="flex flex-col min-h-screen bg-app-bg pb-20">
      <Header
        title="Home"
        subtitle={`${ROLE_LABELS[role] || role} Dashboard`}
        badge={shift ? `Shift ${shift.shift_type} · ${shift.stage}` : 'No shift'}
      />

      {/* Welcome card */}
      <div className="mx-4 mb-4 bg-app-card rounded-2xl p-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-app-muted text-xs mb-1">Good shift,</p>
            <h2 className="text-white font-bold text-xl">{user?.name}</h2>
            <p className="text-app-muted text-sm">{ROLE_LABELS[role]}</p>
          </div>
          <div className="text-right">
            <p className="text-app-muted text-xs">{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
            {shift && (
              <button onClick={() => endShift().then(() => navigate('/shift-stage'))}
                className="text-xs text-red-400 mt-1 underline">End Shift</button>
            )}
            {!shift && (
              <button onClick={() => navigate('/shift-stage')}
                className="text-xs text-app-accent mt-1 underline">Set Shift</button>
            )}
          </div>
        </div>
      </div>

      {/* Tasks due */}
      {tasks.length > 0 && (
        <div className="mx-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-white font-semibold">Due Today</h3>
            <button onClick={() => navigate('/tasks')} className="text-app-accent text-sm">See all</button>
          </div>
          <div className="flex flex-col gap-2">
            {tasks.map(task => (
              <button key={task.id} onClick={() => navigate('/tasks')}
                className="bg-app-card rounded-xl p-3 text-left w-full flex justify-between items-center btn-press">
                <div>
                  <p className="text-white text-sm font-medium">{task.title}</p>
                  <p className="text-app-muted text-xs">{task.description}</p>
                </div>
                <PriorityDot priority={task.priority} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Role-specific quick actions */}
      <div className="mx-4 mb-4">
        <h3 className="text-white font-semibold mb-2">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          {getQuickActions(role, stats).map(({ label, sub, path, color }) => (
            <button key={label} onClick={() => navigate(path)}
              className="bg-app-card rounded-2xl p-4 text-left btn-press">
              <div className={`w-2 h-2 rounded-full ${color} mb-3`} />
              <p className="text-white font-semibold text-sm">{label}</p>
              <p className="text-app-muted text-xs mt-0.5">{sub}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PriorityDot({ priority }) {
  const colors = { High: 'bg-red-500', Med: 'bg-yellow-400', Low: 'bg-green-500' };
  return <div className={`w-2.5 h-2.5 rounded-full ${colors[priority] || 'bg-gray-500'} flex-shrink-0`} />;
}

function getQuickActions(role, stats) {
  const base = [
    { label: 'Tasks', sub: 'Pending approvals', path: '/tasks', color: 'bg-app-accent' },
    { label: 'Incidents', sub: 'Report / view', path: '/incidents', color: 'bg-orange-400' },
  ];
  const roleActions = {
    maintenance: [
      { label: 'Tickets', sub: `${stats.openTickets || 0} open · ${stats.highTickets || 0} HIGH`, path: '/incidents/maintenance', color: 'bg-red-500' },
      { label: 'PM Checks', sub: 'Preventive tasks', path: '/incidents/pm', color: 'bg-blue-500' },
    ],
    quality: [
      { label: 'Quality Gates', sub: '4 gates workflow', path: '/log/quality', color: 'bg-blue-500' },
    ],
    store: [
      { label: 'Work Orders', sub: `${stats.openOrders || 0} open`, path: '/log/store', color: 'bg-green-500' },
      { label: 'Scrap Log', sub: `${stats.pendingScrap || 0} pending dispatch`, path: '/log/scrap', color: 'bg-yellow-500' },
    ],
    production: [
      { label: 'Quality Gates', sub: 'Log checks', path: '/log/quality', color: 'bg-blue-500' },
    ],
    line_manager: [
      { label: 'ESG Dashboard', sub: 'Emissions report', path: '/esg', color: 'bg-green-500' },
      { label: 'Maintenance', sub: `${stats.openTickets || 0} open tickets`, path: '/incidents/maintenance', color: 'bg-red-500' },
      { label: 'Production Log', sub: 'Daily stage snapshot', path: '/log/production', color: 'bg-orange-500' },
      { label: 'Quality', sub: 'Gate oversight', path: '/log/quality', color: 'bg-blue-500' },
    ],
    safety_hr: [
      { label: 'Incidents', sub: 'Safety reports', path: '/incidents', color: 'bg-red-500' },
    ],
    admin: [
      { label: 'ESG Dashboard', sub: 'Emissions report', path: '/esg', color: 'bg-green-500' },
      { label: 'ESG Config', sub: 'Emission factors', path: '/admin/emission-factors', color: 'bg-green-700' },
      { label: 'Users', sub: 'Manage access', path: '/admin/users', color: 'bg-purple-500' },
      { label: 'Maintenance', sub: 'All tickets', path: '/incidents/maintenance', color: 'bg-red-500' },
    ],
  };
  return [...(roleActions[role] || []), ...base].slice(0, 4);
}
