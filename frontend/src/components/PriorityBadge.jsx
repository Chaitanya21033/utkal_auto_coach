const PRIORITY_STYLES = {
  HIGH: 'bg-red-600 text-white',
  High: 'bg-red-600 text-white',
  MED:  'bg-yellow-500 text-black',
  Med:  'bg-yellow-500 text-black',
  LOW:  'bg-green-500 text-black',
  Low:  'bg-green-500 text-black',
};

export default function PriorityBadge({ priority }) {
  const style = PRIORITY_STYLES[priority] || 'bg-gray-600 text-white';
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded ${style}`}>
      {priority?.toUpperCase()}
    </span>
  );
}
