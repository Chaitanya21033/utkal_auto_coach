import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import api from '../../api/client';

const GATE_INFO = {
  rm_incoming: { label: 'RM Incoming', desc: 'Gate 1' },
  in_process:  { label: 'In-Process',  desc: 'Gate 2' },
  pre_pdi:     { label: 'Pre-PDI',      desc: 'Gate 3' },
  fg_dispatch: { label: 'FG Dispatch',  desc: 'Gate 4' },
};

export default function QualityGateSelect() {
  const navigate = useNavigate();
  const [gates, setGates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/quality/gates')
      .then(res => setGates(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-app-bg pb-20">
      <Header title="Quality" subtitle="4 Gates workflow" badge="Today" back />

      <div className="mx-4 bg-app-card rounded-2xl p-4 mb-4">
        <p className="text-app-muted text-sm mb-3">Select Gate</p>
        {loading && <p className="text-app-muted text-sm py-4 text-center">Loading...</p>}
        <div className="flex flex-col gap-2">
          {gates.map(gate => (
            <button key={gate.gate_type}
              onClick={() => navigate(`/log/quality/${gate.gate_type}`)}
              className="w-full bg-app-input rounded-xl p-4 flex items-center gap-3 text-left btn-press">
              <div className="w-10 h-10 bg-app-border rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-app-muted font-bold text-sm">G{gate.gate_no}</span>
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold">{gate.label}</p>
                <p className="text-app-muted text-xs">{gate.desc} · Tap to open form · {gate.today_count} today</p>
              </div>
              <span className="text-app-muted text-xl">&rsaquo;</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent history */}
      <div className="mx-4">
        <button onClick={() => navigate('/log/quality/history')}
          className="w-full border border-app-border text-app-muted py-3 rounded-2xl text-sm btn-press">
          View History
        </button>
      </div>
    </div>
  );
}
