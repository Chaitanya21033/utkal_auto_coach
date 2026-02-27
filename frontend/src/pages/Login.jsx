import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [employeeId, setEmployeeId] = useState('');
  const [pin, setPin] = useState('');
  const [step, setStep] = useState('id'); // 'id' | 'pin'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  function handleKeyPress(key) {
    if (step === 'id') {
      if (key === 'back') setEmployeeId(p => p.slice(0, -1));
      else if (employeeId.length < 10) setEmployeeId(p => p + key);
    } else {
      if (key === 'back') setPin(p => p.slice(0, -1));
      else if (pin.length < 4) setPin(p => p + key);
    }
    setError('');
  }

  async function handleLogin() {
    if (!employeeId) { setError('Enter Employee ID'); return; }
    if (!pin || pin.length < 4) { setError('Enter 4-digit PIN'); return; }
    setLoading(true);
    try {
      await login(employeeId, pin);
      navigate('/role-select');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials');
      setPin('');
    } finally {
      setLoading(false);
    }
  }

  function proceedToPin() {
    if (!employeeId) { setError('Enter Employee ID'); return; }
    setStep('pin');
    setError('');
  }

  const keys = ['1','2','3','4','5','6','7','8','9','','0','back'];

  return (
    <div className="flex flex-col h-screen bg-app-bg">
      {/* Header */}
      <div className="px-4 pt-8 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-white font-bold text-2xl tracking-wide">UTKAL ACTION HUB</h1>
            <p className="text-app-muted text-sm mt-1">Secure login</p>
          </div>
          <span className="border border-app-accent text-app-accent text-xs px-3 py-1 rounded-full">v1.0</span>
        </div>
      </div>

      {/* Input display */}
      <div className="mx-4 mb-4 bg-app-card rounded-2xl p-5">
        {step === 'id' ? (
          <>
            <p className="text-app-muted text-sm mb-3">Enter Employee ID</p>
            <div className="bg-app-input rounded-xl px-4 py-3 text-white text-lg font-mono tracking-widest min-h-[44px]">
              {employeeId || <span className="text-app-muted">e.g. ADM001</span>}
            </div>
            <p className="text-app-muted text-xs mt-2">Type your employee ID using the keypad</p>
          </>
        ) : (
          <>
            <p className="text-app-muted text-sm mb-3">Enter PIN</p>
            <div className="flex gap-3 justify-center py-2">
              {[0,1,2,3].map(i => (
                <div key={i}
                  className={`w-4 h-4 rounded-full border-2 transition-colors ${i < pin.length ? 'bg-app-accent border-app-accent' : 'border-app-border'}`}
                />
              ))}
            </div>
            <p className="text-app-muted text-xs text-center mt-2">4-digit PIN · <button className="text-app-accent underline" onClick={() => setStep('id')}>Change ID</button></p>
          </>
        )}
        {error && <p className="text-red-400 text-sm mt-2 text-center">{error}</p>}
      </div>

      {/* Keypad */}
      <div className="mx-4 mb-4 bg-app-card rounded-2xl p-3 flex-1">
        <div className="grid grid-cols-3 gap-2 h-full">
          {keys.map((key, i) => {
            if (key === '') return <div key={i} />;
            return (
              <button key={i}
                onClick={() => key === 'back' ? handleKeyPress('back') : handleKeyPress(key)}
                className="bg-app-input rounded-xl flex flex-col items-center justify-center py-4 active:bg-app-border transition-colors btn-press">
                {key === 'back' ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
                    <line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/>
                  </svg>
                ) : (
                  <>
                    <span className="text-white text-xl font-semibold">{key}</span>
                    <span className="text-app-muted text-[9px] mt-0.5">
                      {{'2':'ABC','3':'DEF','4':'GHI','5':'JKL','6':'MNO','7':'PQRS','8':'TUV','9':'WXYZ'}[key] || ''}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Login button */}
      <div className="px-4 pb-8">
        <button
          onClick={step === 'id' ? proceedToPin : handleLogin}
          disabled={loading}
          className="w-full bg-app-accent text-black font-bold text-lg py-4 rounded-2xl btn-press disabled:opacity-50">
          {loading ? 'CHECKING...' : step === 'id' ? 'NEXT' : 'LOGIN'}
        </button>
      </div>
    </div>
  );
}
