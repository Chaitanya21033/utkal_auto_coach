import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import PriorityBadge from '../../components/PriorityBadge';
import api from '../../api/client';

function Field({ label, value, onChange, multiline, disabled }) {
  return (
    <div className="mb-4">
      <p className="text-app-muted text-xs mb-1">{label}</p>
      {multiline ? (
        <textarea
          value={value || ''}
          onChange={e => onChange?.(e.target.value)}
          disabled={disabled}
          rows={2}
          className="w-full bg-app-input text-white rounded-xl px-4 py-3 text-sm resize-none disabled:opacity-60"
          placeholder={`Enter ${label.toLowerCase()}`}
        />
      ) : (
        <input
          type="text"
          value={value || ''}
          onChange={e => onChange?.(e.target.value)}
          disabled={disabled}
          className="w-full bg-app-input text-white rounded-xl px-4 py-3 text-sm disabled:opacity-60"
          placeholder={`Enter ${label.toLowerCase()}`}
        />
      )}
    </div>
  );
}

export default function TicketDetail() {
  const { ticketNo } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadTicket(); }, [ticketNo]);

  async function loadTicket() {
    try {
      const res = await api.get(`/maintenance/tickets/${ticketNo}`);
      setTicket(res.data);
      setForm({
        root_cause: res.data.root_cause || '',
        action_taken: res.data.action_taken || '',
        spares_used: res.data.spares_used || '',
        verified_by: res.data.verified_by || '',
        photo_proof: res.data.photo_proof || '',
      });
    } catch (e) { setError('Ticket not found'); }
  }

  async function handleClose() {
    setSaving(true);
    try {
      await api.patch(`/maintenance/tickets/${ticketNo}`, {
        ...form,
        status: 'closed',
      });
      navigate(-1);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to close ticket');
    } finally { setSaving(false); }
  }

  async function handleUpdate(status) {
    setSaving(true);
    try {
      await api.patch(`/maintenance/tickets/${ticketNo}`, { ...form, status });
      await loadTicket();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to update ticket');
    } finally { setSaving(false); }
  }

  if (!ticket && !error) return <div className="flex items-center justify-center h-screen bg-app-bg"><p className="text-app-muted">Loading...</p></div>;
  if (error) return <div className="flex items-center justify-center h-screen bg-app-bg"><p className="text-red-400">{error}</p></div>;

  const isClosed = ticket.status === 'closed';
  const downtime = ticket.created_at ? Math.round((Date.now() - new Date(ticket.created_at).getTime()) / 60000) : 0;

  return (
    <div className="flex flex-col min-h-screen bg-app-bg pb-20">
      <Header title="Ticket Detail" subtitle="Close with root-cause + proof" badge={ticket.ticket_no} back />

      {/* Ticket summary card */}
      <div className="mx-4 mb-4 bg-app-card rounded-2xl p-4">
        <div className="flex justify-between items-start mb-3">
          <h2 className="text-white font-bold text-xl">{ticket.title}</h2>
          <PriorityBadge priority={ticket.priority} />
        </div>
        <div className="text-app-muted text-sm grid grid-cols-2 gap-1">
          <span>Stage: <span className="text-white">{ticket.stage}</span></span>
          <span>Machine: <span className="text-white">{ticket.machine_id}</span></span>
          <span>Started: <span className="text-white">{new Date(ticket.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span></span>
          <span>Downtime: <span className="text-white">{Math.floor(downtime / 60)}h {downtime % 60}m</span></span>
        </div>
      </div>

      {/* Form */}
      <div className="mx-4 bg-app-card rounded-2xl p-4 mb-4">
        <Field label="Root Cause" value={form.root_cause} onChange={v => setForm(f => ({...f, root_cause: v}))} disabled={isClosed} />
        <Field label="Action Taken" value={form.action_taken} onChange={v => setForm(f => ({...f, action_taken: v}))} disabled={isClosed} multiline />
        <Field label="Spares Used" value={form.spares_used} onChange={v => setForm(f => ({...f, spares_used: v}))} disabled={isClosed} />
        <Field label="Verified By" value={form.verified_by} onChange={v => setForm(f => ({...f, verified_by: v}))} disabled={isClosed} />
        <Field label="Photo Proof" value={form.photo_proof} onChange={v => setForm(f => ({...f, photo_proof: v}))} disabled={isClosed} />
      </div>

      {error && <p className="text-red-400 text-sm px-4 mb-2">{error}</p>}

      {/* Actions */}
      {!isClosed && (
        <div className="px-4 flex flex-col gap-2">
          {ticket.status === 'open' && (
            <button onClick={() => handleUpdate('in_progress')} disabled={saving}
              className="w-full border border-yellow-400 text-yellow-400 py-3 rounded-2xl font-semibold btn-press disabled:opacity-50">
              MARK IN PROGRESS
            </button>
          )}
          <button onClick={handleClose} disabled={saving}
            className="w-full bg-app-accent text-black font-bold text-lg py-4 rounded-2xl btn-press disabled:opacity-50">
            {saving ? 'SAVING...' : 'CLOSE TICKET'}
          </button>
        </div>
      )}
      {isClosed && (
        <div className="mx-4 bg-green-900/30 border border-green-600 rounded-2xl p-4 text-center">
          <p className="text-green-400 font-semibold">Ticket Closed</p>
          <p className="text-app-muted text-xs mt-1">Closed {new Date(ticket.closed_at).toLocaleString('en-IN')}</p>
        </div>
      )}
    </div>
  );
}
