import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import api from '../../api/client';

const METER_TYPES = [
  { value: 'electricity', label: 'Electricity', unit: 'kWh', icon: '⚡', color: 'text-yellow-400' },
  { value: 'water',       label: 'Water',       unit: 'KL',  icon: '💧', color: 'text-blue-400' },
];

const METER_IDS = {
  electricity: ['MAIN-ELEC', 'PRODUCTION-ELEC', 'OFFICE-ELEC'],
  water:       ['MAIN-WATER', 'PRODUCTION-WATER', 'CANTEEN-WATER'],
};

// ── CDN Tesseract loader (lazy) ───────────────────────────────────────────────
async function loadTesseract() {
  if (window.Tesseract) return window.Tesseract;
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/tesseract.js@4.1.1/dist/tesseract.min.js';
    s.onload  = () => resolve(window.Tesseract);
    s.onerror = () => reject(new Error('Failed to load Tesseract.js'));
    document.head.appendChild(s);
  });
}

async function ocrImage(imageDataUrl) {
  const Tesseract = await loadTesseract();
  const { data: { text } } = await Tesseract.recognize(imageDataUrl, 'eng', {
    tessedit_char_whitelist: '0123456789.',
    logger: () => {},
  });
  // Extract the longest numeric sequence found (most likely the meter reading)
  const nums = text.match(/\d+\.?\d*/g) || [];
  nums.sort((a, b) => b.length - a.length);
  return { raw: text.trim(), extracted: nums[0] || '' };
}

// ─────────────────────────────────────────────────────────────────────────────

export default function MeterReading() {
  const navigate = useNavigate();
  const fileRef  = useRef(null);

  const [meterType, setMeterType] = useState('electricity');
  const [meterId,   setMeterId]   = useState(METER_IDS.electricity[0]);
  const [imageUrl,  setImageUrl]  = useState(null);
  const [reading,   setReading]   = useState('');
  const [ocrRaw,    setOcrRaw]    = useState('');
  const [ocrStatus, setOcrStatus] = useState('idle'); // idle | loading | done | error
  const [prevReading, setPrevReading] = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [error,     setError]     = useState('');

  const meta = METER_TYPES.find(t => t.value === meterType);

  // Load previous reading whenever meter selection changes
  useEffect(() => {
    api.get(`/meters?meter_type=${meterType}&meter_id=${encodeURIComponent(meterId)}&limit=1`)
      .then(res => setPrevReading(res.data[0] ?? null))
      .catch(() => setPrevReading(null));
  }, [meterType, meterId]);

  function handleMeterTypeChange(type) {
    setMeterType(type);
    setMeterId(METER_IDS[type][0]);
    setImageUrl(null);
    setReading('');
    setOcrRaw('');
    setOcrStatus('idle');
    setError('');
  }

  async function handleCapture(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setReading('');
    setOcrRaw('');
    setOcrStatus('loading');
    setError('');

    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const { raw, extracted } = await ocrImage(ev.target.result);
          setOcrRaw(raw);
          setReading(extracted);
          setOcrStatus('done');
        } catch {
          setOcrStatus('error');
          setError('OCR failed — please type the reading manually.');
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setOcrStatus('error');
    }
  }

  async function handleSave() {
    if (!reading || isNaN(Number(reading))) {
      setError('Enter a valid numeric reading');
      return;
    }
    if (prevReading && Number(reading) < prevReading.reading_value) {
      if (!window.confirm(`Reading ${reading} is less than previous (${prevReading.reading_value}). Meter rollover? Continue?`)) return;
    }
    setSaving(true);
    try {
      await api.post('/meters', {
        meter_type: meterType,
        meter_id:   meterId,
        reading_value: Number(reading),
        photo_data: imageUrl,   // store as data URL for display
        ocr_raw: ocrRaw || null,
      });
      setSaved(true);
      setTimeout(() => navigate('/log/meters'), 1200);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to save reading');
    } finally { setSaving(false); }
  }

  const consumption = prevReading && reading
    ? (Number(reading) - prevReading.reading_value).toFixed(1)
    : null;

  return (
    <div className="flex flex-col min-h-screen bg-app-bg pb-24">
      <Header title="Meter Reading" subtitle="OCR + manual entry" back />

      {/* Meter type selector */}
      <div className="mx-4 mb-3 bg-app-card rounded-2xl p-4">
        <p className="text-app-muted text-xs mb-2">Meter Type</p>
        <div className="flex gap-2">
          {METER_TYPES.map(t => (
            <button key={t.value} onClick={() => handleMeterTypeChange(t.value)}
              className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm btn-press
                ${meterType === t.value ? 'bg-app-accent text-black' : 'bg-app-input text-white'}`}>
              <span>{t.icon}</span><span>{t.label}</span>
            </button>
          ))}
        </div>

        <p className="text-app-muted text-xs mt-3 mb-1">Meter ID</p>
        <div className="flex flex-wrap gap-2">
          {METER_IDS[meterType].map(id => (
            <button key={id} onClick={() => setMeterId(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium btn-press
                ${meterId === id ? 'bg-app-accent text-black' : 'bg-app-input text-white'}`}>
              {id}
            </button>
          ))}
        </div>
      </div>

      {/* Previous reading */}
      {prevReading && (
        <div className="mx-4 mb-3 bg-app-card rounded-2xl p-3 flex justify-between items-center">
          <div>
            <p className="text-app-muted text-xs">Previous Reading</p>
            <p className="text-white font-semibold">{prevReading.reading_value.toLocaleString()} {meta.unit}</p>
          </div>
          <p className="text-app-muted text-xs text-right">
            {new Date(prevReading.recorded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </p>
        </div>
      )}

      {/* Camera capture */}
      <div className="mx-4 mb-3 bg-app-card rounded-2xl p-4">
        <p className="text-app-muted text-xs mb-2">Capture / Upload Meter Photo</p>
        <input ref={fileRef} type="file" accept="image/*" capture="environment"
          onChange={handleCapture} className="hidden" />

        {imageUrl ? (
          <div className="relative">
            <img src={imageUrl} alt="Meter" className="w-full rounded-xl max-h-48 object-cover" />
            <button onClick={() => fileRef.current?.click()}
              className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-3 py-1.5 rounded-lg">
              Retake
            </button>
            {ocrStatus === 'loading' && (
              <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                <p className="text-white text-sm">Reading meter with OCR...</p>
              </div>
            )}
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()}
            className="w-full h-32 border-2 border-dashed border-app-border rounded-xl flex flex-col items-center justify-center gap-2 btn-press">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="1.5">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <p className="text-app-muted text-sm">Tap to take photo</p>
            <p className="text-app-muted text-xs">OCR will auto-read the value</p>
          </button>
        )}

        {ocrStatus === 'done' && (
          <p className="text-green-400 text-xs mt-2">OCR extracted: <strong>{ocrRaw}</strong></p>
        )}
        {ocrStatus === 'error' && (
          <p className="text-yellow-400 text-xs mt-2">OCR could not read — enter manually below</p>
        )}
      </div>

      {/* Manual / confirmed reading input */}
      <div className="mx-4 mb-3 bg-app-card rounded-2xl p-4">
        <p className="text-app-muted text-xs mb-1">
          Current Reading ({meta.unit})
          {ocrStatus === 'done' && <span className="text-green-400 ml-1">← pre-filled by OCR</span>}
        </p>
        <input
          type="number"
          inputMode="decimal"
          value={reading}
          onChange={e => { setReading(e.target.value); setError(''); }}
          className="w-full bg-app-input text-white rounded-xl px-4 py-3 text-xl font-mono"
          placeholder={`e.g. ${prevReading ? prevReading.reading_value + 1200 : '48000'}`}
        />
        {consumption !== null && (
          <p className="text-app-muted text-sm mt-2">
            Consumption since last reading:
            <span className={`font-bold ml-1 ${Number(consumption) < 0 ? 'text-red-400' : meta.color}`}>
              {consumption} {meta.unit}
            </span>
          </p>
        )}
      </div>

      {error && <p className="text-red-400 text-sm px-4 mb-2">{error}</p>}

      {saved ? (
        <div className="mx-4 bg-green-900/30 border border-green-600 rounded-2xl p-4 text-center">
          <p className="text-green-400 font-semibold">Reading saved! ESG updated.</p>
        </div>
      ) : (
        <div className="px-4">
          <button onClick={handleSave} disabled={saving || !reading}
            className="w-full bg-app-accent text-black font-bold text-lg py-4 rounded-2xl btn-press disabled:opacity-50">
            {saving ? 'SAVING...' : 'SAVE READING'}
          </button>
        </div>
      )}
    </div>
  );
}
