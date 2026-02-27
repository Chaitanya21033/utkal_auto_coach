import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import BottomNav from './components/BottomNav';

// Pages
import Login           from './pages/Login';
import RoleSelect      from './pages/RoleSelect';
import ShiftStage      from './pages/ShiftStage';
import Home            from './pages/Home';
import Log             from './pages/Log';
import Incidents       from './pages/Incidents';
import Tasks           from './pages/Tasks';
import Profile         from './pages/Profile';

// Maintenance
import MaintenanceQueue from './pages/maintenance/MaintenanceQueue';
import TicketDetail     from './pages/maintenance/TicketDetail';
import CreateTicket     from './pages/maintenance/CreateTicket';
import PMChecklist      from './pages/maintenance/PMChecklist';

// Quality
import QualityGateSelect from './pages/quality/QualityGateSelect';
import QualityGateForm   from './pages/quality/QualityGateForm';

// Store
import WorkOrderSearch from './pages/store/WorkOrderSearch';
import IssueMaterial   from './pages/store/IssueMaterial';
import ScrapLog        from './pages/store/ScrapLog';

// Admin
import UserManagement from './pages/admin/UserManagement';

function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/home" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <div className="app-shell">
      <Routes>
        {/* Auth */}
        <Route path="/login" element={user ? <Navigate to="/home" replace /> : <Login />} />
        <Route path="/role-select" element={<ProtectedRoute><RoleSelect /></ProtectedRoute>} />
        <Route path="/shift-stage" element={<ProtectedRoute><ShiftStage /></ProtectedRoute>} />

        {/* Main tabs */}
        <Route path="/home"      element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/log"       element={<ProtectedRoute><Log /></ProtectedRoute>} />
        <Route path="/incidents" element={<ProtectedRoute><Incidents /></ProtectedRoute>} />
        <Route path="/tasks"     element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
        <Route path="/profile"   element={<ProtectedRoute><Profile /></ProtectedRoute>} />

        {/* Maintenance */}
        <Route path="/incidents/maintenance"        element={<ProtectedRoute><MaintenanceQueue /></ProtectedRoute>} />
        <Route path="/incidents/ticket/:ticketNo"   element={<ProtectedRoute><TicketDetail /></ProtectedRoute>} />
        <Route path="/incidents/create-ticket"      element={<ProtectedRoute><CreateTicket /></ProtectedRoute>} />
        <Route path="/incidents/pm"                 element={<ProtectedRoute><PMChecklist /></ProtectedRoute>} />
        <Route path="/incidents/pm/:group"          element={<ProtectedRoute><PMChecklist /></ProtectedRoute>} />

        {/* Quality */}
        <Route path="/log/quality"           element={<ProtectedRoute><QualityGateSelect /></ProtectedRoute>} />
        <Route path="/log/quality/:gateType" element={<ProtectedRoute><QualityGateForm /></ProtectedRoute>} />

        {/* Store */}
        <Route path="/log/store"              element={<ProtectedRoute><WorkOrderSearch /></ProtectedRoute>} />
        <Route path="/log/store/:woNumber"    element={<ProtectedRoute><IssueMaterial /></ProtectedRoute>} />
        <Route path="/log/scrap"              element={<ProtectedRoute><ScrapLog /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><UserManagement /></ProtectedRoute>} />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to={user ? '/home' : '/login'} replace />} />
        <Route path="*" element={<Navigate to={user ? '/home' : '/login'} replace />} />
      </Routes>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
