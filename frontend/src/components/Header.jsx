import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header({ title, subtitle, badge, back }) {
  const navigate = useNavigate();
  const { shift } = useAuth();

  return (
    <div className="px-4 pt-4 pb-3 flex items-start justify-between">
      <div className="flex items-center gap-3">
        {back && (
          <button onClick={() => navigate(-1)} className="text-app-muted text-2xl leading-none">&lsaquo;</button>
        )}
        <div>
          <h1 className="text-white font-bold text-xl leading-tight">{title}</h1>
          {subtitle && <p className="text-app-muted text-xs mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {badge && (
        <span className="text-xs border border-app-accent text-app-accent rounded-full px-3 py-1 font-medium whitespace-nowrap">
          {badge}
        </span>
      )}
      {!badge && shift && (
        <span className="text-xs border border-app-border text-app-muted rounded-full px-3 py-1 whitespace-nowrap">
          Shift {shift.shift_type}
        </span>
      )}
    </div>
  );
}
