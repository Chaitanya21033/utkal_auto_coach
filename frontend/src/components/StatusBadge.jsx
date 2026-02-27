const STATUS_STYLES = {
  open:          'border border-app-muted text-app-muted',
  in_progress:   'border border-yellow-400 text-yellow-400',
  closed:        'border border-green-500 text-green-500',
  active:        'border border-green-500 text-green-500',
  pending:       'bg-yellow-500 text-black',
  dispatched:    'bg-green-500 text-black',
  pass:          'bg-green-500 text-black',
  hold:          'bg-red-500 text-white',
  investigating: 'border border-orange-400 text-orange-400',
  completed:     'border border-green-500 text-green-500',
};

const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In progress',
  closed: 'Closed',
  active: 'Active',
  pending: 'Pending dispatch',
  dispatched: 'Dispatched',
  pass: 'Pass',
  hold: 'Hold / Rework',
  investigating: 'Investigating',
  completed: 'Completed',
};

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || 'border border-app-border text-app-muted';
  const label = STATUS_LABELS[status] || status;
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded ${style}`}>
      {label}
    </span>
  );
}
