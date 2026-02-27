import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import PriorityBadge from '../components/PriorityBadge';
import api from '../api/client';

export default function Tasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [completing, setCompleting] = useState(null);

  useEffect(() => { loadTasks(); }, []);

  async function loadTasks() {
    setLoading(true);
    try {
      const res = await api.get('/tasks');
      setTasks(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function loadCompleted() {
    try {
      const res = await api.get('/tasks/completed');
      setCompleted(res.data);
    } catch (e) { console.error(e); }
  }

  async function markDone(taskId) {
    setCompleting(taskId);
    try {
      await api.patch(`/tasks/${taskId}`, { status: 'completed' });
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (e) { console.error(e); }
    finally { setCompleting(null); }
  }

  function handleModuleNav(task) {
    if (!task.module_ref) return;
    if (task.module_ref.startsWith('maintenance:')) navigate('/incidents/maintenance');
    else if (task.module_ref.startsWith('quality:')) navigate('/log/quality');
    else if (task.module_ref.startsWith('store:')) navigate('/log/store');
    else navigate('/home');
  }

  return (
    <div className="flex flex-col min-h-screen bg-app-bg pb-20">
      <Header title="Tasks" subtitle="Closures + approvals" badge={`Due: ${tasks.length}`} />

      <div className="mx-4 bg-app-card rounded-2xl p-4 mb-4">
        <p className="text-app-muted text-xs mb-3">Today</p>
        {loading && <p className="text-app-muted text-sm text-center py-8">Loading...</p>}
        <div className="flex flex-col gap-2">
          {tasks.map(task => (
            <div key={task.id} className="bg-app-input rounded-xl p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 mr-3">
                  <div className="flex items-center gap-2 mb-1">
                    <PriorityBadge priority={task.priority} />
                  </div>
                  <button onClick={() => handleModuleNav(task)} className="text-left">
                    <p className="text-white font-semibold">{task.title}</p>
                    {task.description && <p className="text-app-muted text-xs mt-0.5">{task.description}</p>}
                  </button>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button onClick={() => handleModuleNav(task)}
                    className="text-app-muted text-xl">&rsaquo;</button>
                  <button onClick={() => markDone(task.id)} disabled={completing === task.id}
                    className="text-xs text-green-400 border border-green-600 px-2 py-1 rounded-lg btn-press disabled:opacity-50">
                    {completing === task.id ? '...' : 'Done'}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!loading && tasks.length === 0 && (
            <div className="text-center py-8">
              <p className="text-green-400 font-semibold">All tasks done!</p>
              <p className="text-app-muted text-sm mt-1">No pending tasks</p>
            </div>
          )}
        </div>
      </div>

      {/* View Completed */}
      <div className="mx-4">
        <button onClick={() => { setShowCompleted(!showCompleted); if (!showCompleted) loadCompleted(); }}
          className="w-full border border-app-border text-app-muted py-3 rounded-2xl text-sm btn-press">
          {showCompleted ? 'Hide Completed' : 'View Completed'}
        </button>
        {showCompleted && (
          <div className="mt-3 bg-app-card rounded-2xl p-4">
            <p className="text-app-muted text-xs mb-3">Completed</p>
            <div className="flex flex-col gap-2">
              {completed.map(task => (
                <div key={task.id} className="bg-app-input rounded-xl p-3 opacity-60">
                  <div className="flex items-center gap-2 mb-1">
                    <PriorityBadge priority={task.priority} />
                  </div>
                  <p className="text-white text-sm line-through">{task.title}</p>
                  <p className="text-app-muted text-xs">{task.description}</p>
                </div>
              ))}
              {completed.length === 0 && <p className="text-app-muted text-sm text-center">No completed tasks</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
