import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import api from '../../api/client';

const PERIODS = [
  { key: 'daily',     label: 'Week' },
  { key: 'weekly',    label: '8 Wks' },
  { key: 'monthly',   label: 'Year' },
  { key: 'quarterly', label: 'Qtrs' },
];

// ── Simple inline bar chart ───────────────────────────────────────────────────
function BarChart({ series, color, unit }) {
  if (!series?.length) return <p className="text-app-muted text-xs text-center py-4">No data</p>;
  const max = Math.max(...series.map(d => d.val), 1);
  return (
    <div className="flex items-end gap-1 h-20 w-full">
      {series.map((d, i) => {
        const pct = (d.val / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full rounded-t-sm transition-all" style={{ height: `${Math.max(pct, 2)}%`, backgroundColor: color }} />
            <span className="text-[8px] text-app-muted truncate w-full text-center">{d.label?.slice(-5) ?? ''}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ label, value, unit, sub, color = 'text-white', icon }) {
  return (
    <div className="bg-app-card rounded-2xl p-4 flex-1">
      <div className="flex items-center gap-1.5 mb-1">
        {icon && <span className="text-base">{icon}</span>}
        <p className="text-app-muted text-xs">{label}</p>
      </div>
      <p className={`font-bold text-xl ${color}`}>{value?.toLocaleString() ?? '—'}</p>
      <p className="text-app-muted text-xs">{unit}</p>
      {sub && <p className="text-app-muted text-xs mt-0.5 opacity-70">{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ESGDashboard() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [period,  setPeriod]  = useState('monthly');
  const [data,    setData]    = useState(null);
  const [chart,   setChart]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => { loadData(); }, [period]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [overviewRes, chartRes] = await Promise.all([
        api.get(`/esg/overview?period=${period}`),
        api.get(`/esg/chart?period=${period}`),
      ]);
      setData(overviewRes.data);
      setChart(chartRes.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load ESG data');
    } finally { setLoading(false); }
  }

  const GRID = data?.config?.grid_co2_factor ?? 0.82;
  const elecCO2 = data ? Math.round(data.electricity.kwh * GRID) : 0;

  return (
    <div className="flex flex-col min-h-screen bg-app-bg pb-24">
      <Header
        title="ESG Dashboard"
        subtitle="Sustainability Report Card"
        badge={data ? data.range?.start?.slice(0, 7) : ''}
      />

      {/* Period tabs */}
      <div className="mx-4 mb-4 bg-app-card rounded-xl p-1 flex gap-1">
        {PERIODS.map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors btn-press
              ${period === p.key ? 'bg-app-accent text-black' : 'text-app-muted'}`}>
            {p.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-app-muted">Loading ESG data...</p>
        </div>
      )}
      {error && <p className="text-red-400 text-sm px-4 mb-4">{error}</p>}

      {!loading && data && (
        <>
          {/* Total CO2 hero card */}
          <div className="mx-4 mb-4 bg-green-900/40 border border-green-700 rounded-2xl p-5">
            <p className="text-green-400 text-xs font-semibold mb-1">TOTAL CO₂ EQUIVALENT</p>
            <p className="text-white font-bold text-4xl">
              {data.total_co2_kg.toLocaleString()}
              <span className="text-lg font-normal text-app-muted ml-1">kg CO₂e</span>
            </p>
            <p className="text-app-muted text-xs mt-1">
              {data.range?.start} → {data.range?.end}
            </p>
            <div className="mt-3 flex gap-2">
              <div className="flex-1 bg-black/30 rounded-xl p-2 text-center">
                <p className="text-green-400 text-xs">Scope 1</p>
                <p className="text-white font-bold">{data.production?.direct_co2_kg?.toLocaleString()}</p>
                <p className="text-app-muted text-xs">kg direct</p>
              </div>
              <div className="flex-1 bg-black/30 rounded-xl p-2 text-center">
                <p className="text-yellow-400 text-xs">Scope 2</p>
                <p className="text-white font-bold">{elecCO2.toLocaleString()}</p>
                <p className="text-app-muted text-xs">kg from grid</p>
              </div>
              <div className="flex-1 bg-black/30 rounded-xl p-2 text-center">
                <p className="text-blue-400 text-xs">Scope 3</p>
                <p className="text-white font-bold">
                  {Math.round((data.water?.co2_kg ?? 0) + (data.waste?.co2_kg ?? 0)).toLocaleString()}
                </p>
                <p className="text-app-muted text-xs">kg water+waste</p>
              </div>
            </div>
          </div>

          {/* Electricity + Water KPI row */}
          <div className="mx-4 mb-4 flex gap-3">
            <KPICard
              label="Electricity" icon="⚡"
              value={data.electricity.kwh.toLocaleString()}
              unit="kWh consumed"
              sub={`${data.electricity.co2_kg.toLocaleString()} kg CO₂e`}
              color="text-yellow-400"
            />
            <KPICard
              label="Water" icon="💧"
              value={data.water.kl.toLocaleString()}
              unit="KL consumed"
              sub={`${data.water.co2_kg.toLocaleString()} kg CO₂e`}
              color="text-blue-400"
            />
          </div>

          {/* Production emissions breakdown */}
          <div className="mx-4 mb-4 bg-app-card rounded-2xl p-4">
            <p className="text-white font-semibold mb-3">Production Stage Emissions</p>
            {[
              { label: 'Paint Shop',     value: data.production?.direct_co2_kg ? Math.round(data.production.direct_co2_kg * 0.42) : 0, color: '#ec4899' },
              { label: 'Welding',        value: data.production?.direct_co2_kg ? Math.round(data.production.direct_co2_kg * 0.28) : 0, color: '#f97316' },
              { label: 'Shot Blasting',  value: data.production?.direct_co2_kg ? Math.round(data.production.direct_co2_kg * 0.21) : 0, color: '#a855f7' },
              { label: 'CKD + Assembly', value: data.production?.direct_co2_kg ? Math.round(data.production.direct_co2_kg * 0.09) : 0, color: '#3b82f6' },
            ].map(item => {
              const pct = data.production.direct_co2_kg > 0 ? (item.value / data.production.direct_co2_kg) * 100 : 0;
              return (
                <div key={item.label} className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-app-muted">{item.label}</span>
                    <span className="text-white font-medium">{item.value.toLocaleString()} kg</span>
                  </div>
                  <div className="h-2 bg-app-input rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Waste + Scrap */}
          <div className="mx-4 mb-4 flex gap-3">
            <KPICard
              label="Process Waste" icon="🗑️"
              value={data.waste.kg.toLocaleString()}
              unit="kg generated"
              sub={`${data.waste.co2_kg.toLocaleString()} kg CO₂e`}
              color="text-orange-400"
            />
            <KPICard
              label="Scrap Dispatched" icon="♻️"
              value={data.waste.scrap_kg.toLocaleString()}
              unit="kg dispatched"
              color="text-green-400"
            />
          </div>

          {/* Est. production kWh vs meter reading */}
          <div className="mx-4 mb-4 bg-app-card rounded-2xl p-4">
            <p className="text-app-muted text-xs mb-2">Electricity — Actual vs Estimated</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-app-input rounded-xl p-3 text-center">
                <p className="text-yellow-400 font-bold text-lg">{data.electricity.kwh.toLocaleString()}</p>
                <p className="text-app-muted text-xs">Actual (meter)</p>
              </div>
              <div className="bg-app-input rounded-xl p-3 text-center">
                <p className="text-app-muted font-bold text-lg">{data.production.est_electricity_kwh.toLocaleString()}</p>
                <p className="text-app-muted text-xs">Estimated (stage factors)</p>
              </div>
            </div>
            {data.electricity.kwh > 0 && data.production.est_electricity_kwh > 0 && (
              <p className="text-app-muted text-xs text-center mt-2">
                Variance: {Math.round(((data.electricity.kwh - data.production.est_electricity_kwh) / data.production.est_electricity_kwh) * 100)}%
              </p>
            )}
          </div>

          {/* Charts */}
          {chart?.series && (
            <div className="mx-4 mb-4 bg-app-card rounded-2xl p-4">
              <p className="text-white font-semibold mb-3">Trends</p>
              <p className="text-app-muted text-xs mb-1">Electricity Consumption (kWh)</p>
              <BarChart series={chart.series.electricity} color="#facc15" unit="kWh" />
              <p className="text-app-muted text-xs mb-1 mt-4">Water Consumption (KL)</p>
              <BarChart series={chart.series.water} color="#60a5fa" unit="KL" />
              <p className="text-app-muted text-xs mb-1 mt-4">Production Direct CO₂ (kg)</p>
              <BarChart series={chart.series.production_co2} color="#4ade80" unit="kg" />
            </div>
          )}

          {/* Stage snapshot */}
          {data.stage_snapshot?.length > 0 && (
            <div className="mx-4 mb-4 bg-app-card rounded-2xl p-4">
              <p className="text-white font-semibold mb-3">Latest Stage Snapshot</p>
              <div className="flex flex-col gap-1.5">
                {data.stage_snapshot.map(e => (
                  <div key={e.stage} className="flex justify-between items-center bg-app-input rounded-xl px-3 py-2">
                    <span className="text-white text-sm">{e.stage}</span>
                    <span className="text-app-accent font-bold text-sm">{e.units_in_stage} units</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin config link */}
          {user?.role === 'admin' && (
            <div className="px-4 mb-4">
              <button onClick={() => navigate('/admin/emission-factors')}
                className="w-full border border-app-border text-app-muted py-3 rounded-2xl text-sm btn-press">
                Configure Emission Factors
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
