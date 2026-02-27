import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const STAGES = ['CKD', 'Shot Blasting', 'Welding', 'Paint Shop', 'Final Assembly'];
const SHIFTS = [
  { type: 'A', label: '06-14' },
  { type: 'B', label: '14-22' },
  { type: 'C', label: '22-06' },
];

export default function ShiftStage() {
  const { startShift, shift } = useAuth();
  const navigate = useNavigate();
  const [selectedShift, setSelectedShift] = useState(shift?.shift_type || 'A');
  const [selectedStage, setSelectedStage] = useState(shift?.stage || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleStart() {
    if (!selectedStage) { setError('Please select a stage'); return; }
    setLoading(true);
    try {
      await startShift(selectedShift, selectedStage);
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start shift');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-app-bg pb-20">
      {/* Header */}
      <div className="px-4 pt-8 pb-4 flex justify-between items-start">
        <div>
          <h1 className="text-white font-bold text-2xl">Shift + Stage</h1>
          <p className="text-app-muted text-sm mt-1">Set context for logging</p>
        </div>
        <span className="border border-app-border text-app-muted text-xs px-3 py-1 rounded-full">
          {shift ? 'Active' : 'Not started'}
        </span>
      </div>

      {/* Shift selector */}
      <div className="mx-4 mb-4 bg-app-card rounded-2xl p-4">
        <p className="text-app-muted text-sm mb-3 font-medium">Select Shift</p>
        <div className="flex gap-3">
          {SHIFTS.map(({ type, label }) => (
            <button key={type}
              onClick={() => setSelectedShift(type)}
              className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-semibold transition-colors btn-press
                ${selectedShift === type ? 'bg-app-accent text-black' : 'bg-app-input text-white'}`}>
              <span>{label}</span>
              <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center
                ${selectedShift === type ? 'bg-black text-app-accent' : 'bg-app-border text-white'}`}>{type}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stage selector */}
      <div className="mx-4 mb-4 bg-app-card rounded-2xl p-4">
        <p className="text-app-muted text-sm mb-3 font-medium">Select Stage</p>
        <div className="flex flex-col gap-2">
          {STAGES.map(stage => (
            <button key={stage}
              onClick={() => setSelectedStage(stage)}
              className={`w-full py-4 px-4 rounded-xl flex justify-between items-center font-medium transition-colors btn-press
                ${selectedStage === stage
                  ? 'bg-app-accent text-black'
                  : 'bg-app-input text-white hover:bg-app-border'}`}>
              <span>{stage}</span>
              <span className="text-lg">&gt;</span>
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-red-400 text-sm px-4 mb-2">{error}</p>}

      {/* Start button */}
      <div className="px-4 mt-2">
        <button onClick={handleStart} disabled={loading}
          className="w-full bg-app-accent text-black font-bold text-lg py-4 rounded-2xl btn-press disabled:opacity-50">
          {loading ? 'STARTING...' : 'START SHIFT'}
        </button>
      </div>

      {/* Bottom nav dummy */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] h-16 bg-app-card border-t border-app-border flex items-center justify-around text-app-muted text-xs">
        <span className="text-app-accent font-semibold">Home</span>
        <span>Log</span><span>Incidents</span><span>Tasks</span><span>Profile</span>
      </div>
    </div>
  );
}
