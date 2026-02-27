import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import PriorityBadge from '../../components/PriorityBadge';
import StatusBadge from '../../components/StatusBadge';
import api from '../../api/client';

function fmtAge(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function MaintenanceQueue() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('tickets');
  const [tickets, setTickets] = useState([]);
  const [pmGroups, setPmGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [tab]);

  async function loadData() {
    setLoading(true);
    try {
      if (tab === 'tickets') {
        const res = await api.get('/maintenance/tickets');
        setTickets(res.data.filter(t => t.status !== 'closed'));
      } else {
        const res = await api.get('/maintenance/pm');
        setPmGroups(res.data);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  const openCount = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;

  return (
    <div className="flex flex-col min-h-screen bg-app-bg pb-20">
      <Header title="Maintenance" subtitle="Tickets + Preventive" badge={`Open: ${openCount}`} back />

      {/* Tabs */}
      <div className="mx-4 mb-4 bg-app-card rounded-xl p-1 flex gap-1">
        <button onClick={() => setTab('tickets')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'tickets' ? 'bg-app-accent text-black' : 'text-app-muted'}`}>
          Tickets
        </button>
        <button onClick={() => setTab('pm')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'pm' ? 'bg-app-accent text-black' : 'text-app-muted'}`}>
          PM
        </button>
      </div>

      {/* Content */}
      <div className="mx-4 flex flex-col gap-3 flex-1">
        {loading && <p className="text-app-muted text-sm text-center py-8">Loading...</p>}

        {!loading && tab === 'tickets' && (
          <>
            {tickets.map(ticket => (
              <button key={ticket.id}
                onClick={() => navigate(`/incidents/ticket/${ticket.ticket_no}`)}
                className="bg-app-card rounded-2xl p-4 text-left w-full btn-press">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-app-input rounded-lg flex items-center justify-center">
                      <span className="text-app-muted text-xs">{ticket.machine_id?.slice(0,3)}</span>
                    </div>
                    <div>
                      <PriorityBadge priority={ticket.priority} />
                    </div>
                  </div>
                  <span className="text-app-muted text-sm">{fmtAge(ticket.age_minutes)}</span>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-white font-semibold">{ticket.title}</p>
                    <p className="text-app-muted text-xs">{ticket.stage} · {ticket.machine_id}</p>
                  </div>
                  <StatusBadge status={ticket.status} />
                </div>
              </button>
            ))}
            {tickets.length === 0 && (
              <div className="text-center py-12">
                <p className="text-app-muted">No open tickets</p>
              </div>
            )}
          </>
        )}

        {!loading && tab === 'pm' && (
          <>
            {pmGroups.map(group => (
              <button key={group.machine_group}
                onClick={() => navigate(`/incidents/pm/${encodeURIComponent(group.machine_group)}`)}
                className="bg-app-card rounded-2xl p-4 text-left w-full btn-press">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center">
                      <span className="text-blue-400 text-xs font-bold">PM</span>
                    </div>
                    <div>
                      <p className="text-white font-semibold">{group.machine_group}</p>
                      <p className="text-app-muted text-xs">{group.item_count} checklist items · {group.today_submissions} done today</p>
                    </div>
                  </div>
                  <span className="text-app-muted text-xl">&rsaquo;</span>
                </div>
              </button>
            ))}
          </>
        )}
      </div>

      {/* Create ticket button */}
      {tab === 'tickets' && (
        <div className="mx-4 mt-4 mb-4">
          <button onClick={() => navigate('/incidents/create-ticket')}
            className="w-full border border-app-border text-white py-4 rounded-2xl text-sm font-medium btn-press">
            + Create Ticket
          </button>
        </div>
      )}
    </div>
  );
}
