import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import api from '../../api/client';

export default function WorkOrderSearch() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadOrders(''); }, []);

  async function loadOrders(q) {
    setLoading(true);
    try {
      const res = await api.get(`/store/work-orders${q ? `?search=${encodeURIComponent(q)}` : ''}`);
      setOrders(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  function handleSearch() { loadOrders(search); }

  function dueBadge(offset) {
    if (offset === 0) return { label: 'Due today', className: 'border border-app-accent text-app-accent' };
    if (offset === 1) return { label: 'Due +1 day', className: 'border border-yellow-500 text-yellow-400' };
    return { label: `Due +${offset} days`, className: 'border border-app-border text-app-muted' };
  }

  return (
    <div className="flex flex-col min-h-screen bg-app-bg pb-20">
      <Header title="Store Issue" subtitle="Work order search" badge="Scan supported" back />

      {/* Search bar */}
      <div className="mx-4 mb-4 flex gap-2">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Search WO # / Customer"
          className="flex-1 bg-app-card text-white rounded-xl px-4 py-3 text-sm border border-app-border"
        />
        <button onClick={handleSearch}
          className="bg-app-accent text-black font-bold px-4 rounded-xl btn-press">
          SCAN
        </button>
      </div>

      {/* List */}
      <div className="mx-4 bg-app-card rounded-2xl p-4">
        <p className="text-app-muted text-sm mb-3">Open Work Orders</p>
        {loading && <p className="text-app-muted text-sm py-4 text-center">Loading...</p>}
        <div className="flex flex-col gap-2">
          {orders.map(wo => {
            const due = dueBadge(wo.due_offset);
            return (
              <button key={wo.id}
                onClick={() => navigate(`/log/store/${wo.wo_number}`)}
                className="w-full bg-app-input rounded-xl p-4 flex justify-between items-center btn-press">
                <div className="text-left">
                  <p className="text-white font-semibold">{wo.wo_number}</p>
                  <p className="text-app-muted text-xs">{wo.customer}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-lg ${due.className}`}>{due.label}</span>
                  <span className="text-app-muted">&rsaquo;</span>
                </div>
              </button>
            );
          })}
          {!loading && orders.length === 0 && (
            <p className="text-app-muted text-sm py-4 text-center">No work orders found</p>
          )}
        </div>
      </div>
    </div>
  );
}
