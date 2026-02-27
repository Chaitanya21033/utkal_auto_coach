import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [shift, setShift] = useState(() => {
    try { return JSON.parse(localStorage.getItem('shift')); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  async function login(employee_id, pin) {
    const res = await api.post('/auth/login', { employee_id, pin });
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  }

  async function startShift(shift_type, stage) {
    const res = await api.post('/shifts/start', { shift_type, stage });
    localStorage.setItem('shift', JSON.stringify(res.data));
    setShift(res.data);
    return res.data;
  }

  async function endShift() {
    if (!shift) return;
    await api.patch(`/shifts/${shift.id}/end`);
    localStorage.removeItem('shift');
    setShift(null);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('shift');
    setUser(null);
    setShift(null);
  }

  return (
    <AuthContext.Provider value={{ user, shift, setShift, login, startShift, endShift, logout, loading, setLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
