import { TYPE_COLORS, STATUS_COLORS } from '../../utils/formatters';

export function MemberTypeBadge({ type }) {
  const cls = TYPE_COLORS[type] || 'bg-gray-100 text-gray-700';
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>{type}</span>;
}

export function StatusBadge({ status }) {
  const cls = STATUS_COLORS[status] || 'bg-gray-100 text-gray-700';
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>{status}</span>;
}
