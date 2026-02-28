import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import api from '../../api/client';

const STAGES = ['CKD', 'Shot Blasting', 'Welding', 'Paint Shop', 'Final Assembly', 'Finished Goods'];

const CONFIG_KEYS = [
  { key: 'grid_co2_factor', label: 'Grid CO₂ Factor', unit: 'kg CO₂/kWh', desc: 'India CEA national grid emission factor' },
  { key: 'water_co2_factor', label: 'Water CO₂ Factor', unit: 'kg CO₂/KL',  desc: 'Water treatment & distribution' },
  { key: 'waste_co2_factor', label: 'Waste CO₂ Factor', unit: 'kg CO₂/kg',  desc: 'Landfill equivalent for scrap/waste' },
];

export default function EmissionFactors() {
  const [factors,  setFactors]  = useState([]);
  const [config,   setConfig]   = useState({});
  const [edits,    setEdits]    = useState({});
  const [cfgEdits, setCfgEdits] = useState({});
  const [saving,   setSaving]   = useState({});
  const [saved,    setSaved]    = useState({});
  const [loading,  setLoading]  = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const res = await api.get('/emission-factors');
      setFactors(res.data.factors);
      setConfig(res.data.config);
      // Pre-populate edit state with current values
      const initEdits = {};
      res.data.factors.forEach(f => {
        initEdits[f.stage] = {
          electricity_kwh_per_unit: f.electricity_kwh_per_unit,
          water_kl_per_unit:        f.water_kl_per_unit,
          direct_co2_kg_per_unit:   f.direct_co2_kg_per_unit,
        };
      });
      setEdits(initEdits);
      const initCfg = {};
      Object.entries(res.data.config).forEach(([k, v]) => { initCfg[k] = v; });
      setCfgEdits(initCfg);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function saveStage(stage) {
    setSaving(s => ({ ...s, [stage]: true }));
    try {
      await api.patch(`/emission-factors/${encodeURIComponent(stage)}`, edits[stage]);
      setSaved(s => ({ ...s, [stage]: true }));
      setTimeout(() => setSaved(s => ({ ...s, [stage]: false })), 2000);
    } catch (e) { console.error(e); }
    finally { setSaving(s => ({ ...s, [stage]: false })); }
  }

  async function saveConfig(key) {
    setSaving(s => ({ ...s, [key]: true }));
    try {
      await api.patch(`/emission-factors/config/${key}`, { value: cfgEdits[key] });
      setSaved(s => ({ ...s, [key]: true }));
      setTimeout(() => setSaved(s => ({ ...s, [key]: false })), 2000);
    } catch (e) { console.error(e); }
    finally { setSaving(s => ({ ...s, [key]: false })); }
  }

  function setEdit(stage, field, val) {
    setEdits(e => ({ ...e, [stage]: { ...e[stage], [field]: val } }));
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-app-bg">
      <p className="text-app-muted">Loading emission factors...</p>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-app-bg pb-24">
      <Header title="Emission Factors" subtitle="Admin — ESG configuration" back />

      {/* Global config */}
      <div className="mx-4 mb-4 bg-app-card rounded-2xl p-4">
        <p className="text-white font-semibold mb-3">Global CO₂ Factors</p>
        {CONFIG_KEYS.map(c => (
          <div key={c.key} className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <div>
                <p className="text-white text-sm font-medium">{c.label}</p>
                <p className="text-app-muted text-xs">{c.desc}</p>
              </div>
              <span className="text-app-muted text-xs">{c.unit}</span>
            </div>
            <div className="flex gap-2">
              <input type="number" step="0.001" value={cfgEdits[c.key] ?? config[c.key] ?? ''}
                onChange={e => setCfgEdits(cf => ({ ...cf, [c.key]: e.target.value }))}
                className="flex-1 bg-app-input text-white rounded-xl px-3 py-2 text-sm font-mono" />
              <button onClick={() => saveConfig(c.key)} disabled={saving[c.key]}
                className={`px-4 py-2 rounded-xl text-sm font-semibold btn-press
                  ${saved[c.key] ? 'bg-green-600 text-white' : 'bg-app-accent text-black'} disabled:opacity-50`}>
                {saved[c.key] ? '✓' : saving[c.key] ? '...' : 'Save'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Per-stage factors */}
      <div className="mx-4 mb-2">
        <p className="text-white font-semibold mb-1">Per-Stage Emission Factors</p>
        <p className="text-app-muted text-xs mb-3">Values are per tipper body unit passing through each stage</p>
      </div>

      {STAGES.map(stage => {
        const f = factors.find(f => f.stage === stage);
        const e = edits[stage] || {};
        return (
          <div key={stage} className="mx-4 mb-3 bg-app-card rounded-2xl p-4">
            <p className="text-white font-semibold mb-3">{stage}</p>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div>
                <p className="text-app-muted text-xs mb-1">kWh/unit</p>
                <input type="number" step="0.1" value={e.electricity_kwh_per_unit ?? f?.electricity_kwh_per_unit ?? 0}
                  onChange={ev => setEdit(stage, 'electricity_kwh_per_unit', ev.target.value)}
                  className="w-full bg-app-input text-yellow-400 rounded-xl px-2 py-2 text-sm font-mono text-center" />
              </div>
              <div>
                <p className="text-app-muted text-xs mb-1">KL/unit</p>
                <input type="number" step="0.01" value={e.water_kl_per_unit ?? f?.water_kl_per_unit ?? 0}
                  onChange={ev => setEdit(stage, 'water_kl_per_unit', ev.target.value)}
                  className="w-full bg-app-input text-blue-400 rounded-xl px-2 py-2 text-sm font-mono text-center" />
              </div>
              <div>
                <p className="text-app-muted text-xs mb-1">CO₂ kg/unit</p>
                <input type="number" step="0.1" value={e.direct_co2_kg_per_unit ?? f?.direct_co2_kg_per_unit ?? 0}
                  onChange={ev => setEdit(stage, 'direct_co2_kg_per_unit', ev.target.value)}
                  className="w-full bg-app-input text-red-400 rounded-xl px-2 py-2 text-sm font-mono text-center" />
              </div>
            </div>
            {f?.notes && <p className="text-app-muted text-xs mb-2 italic">{f.notes}</p>}
            <button onClick={() => saveStage(stage)} disabled={saving[stage]}
              className={`w-full py-2 rounded-xl text-sm font-semibold btn-press
                ${saved[stage] ? 'bg-green-600 text-white' : 'bg-app-accent text-black'} disabled:opacity-50`}>
              {saved[stage] ? '✓ Saved' : saving[stage] ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
