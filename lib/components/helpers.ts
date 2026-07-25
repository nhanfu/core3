import { html } from '../html.ts';

export const STATUS_COLORS = {
  'active':         'bg-green-100 text-green-800',
  'in service':     'bg-green-100 text-green-800',
  'maintenance':    'bg-amber-100 text-amber-800',
  'in maintenance': 'bg-amber-100 text-amber-800',
  'out of service': 'bg-red-100 text-red-800',
  'inactive':       'bg-gray-100 text-gray-600',
  'completed':      'bg-green-100 text-green-800',
  'in progress':    'bg-blue-100 text-blue-800',
  'scheduled':      'bg-purple-100 text-purple-800',
  'overdue':        'bg-red-100 text-red-800',
  'pending':        'bg-gray-100 text-gray-700',
  'resolved':       'bg-green-100 text-green-800',
  'open':           'bg-amber-100 text-amber-800',
  'high':           'bg-red-100 text-red-800',
  'medium':         'bg-amber-100 text-amber-800',
  'low':            'bg-green-100 text-green-800',
  'critical':       'bg-red-100 text-red-900',
  'oil change':     'bg-blue-100 text-blue-800',
  'inspection':     'bg-teal-100 text-teal-800',
  'tire':           'bg-gray-100 text-gray-700',
  'brake':          'bg-orange-100 text-orange-800',
  'semi':           'bg-indigo-100 text-indigo-800',
  'box truck':      'bg-violet-100 text-violet-800',
  'flatbed':        'bg-cyan-100 text-cyan-800',
};

export function formatDate(value, format = 'short') {
  if (!value) return '—';
  const d = new Date(String(value).includes('T') ? value : value + 'T00:00:00');
  if (isNaN(d)) return String(value);
  if (format === 'relative') {
    const diffMs = Date.now() - d.getTime();
    const absDays = Math.floor(Math.abs(diffMs) / 86400000);
    const future = diffMs < 0;
    if (absDays === 0) return 'Today';
    if (absDays === 1) return future ? 'Tomorrow' : 'Yesterday';
    if (absDays < 30) return future ? `In ${absDays} days` : `${absDays} days ago`;
    const absWeeks = Math.floor(absDays / 7);
    return future ? `In ${absWeeks}w` : `${absWeeks}w ago`;
  }
  if (format === 'long') {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function fmtCurrency(value, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value ?? 0);
}

export function fmtNumber(value, format = 'number') {
  if (value == null) return '—';
  if (format === 'percent') return Number(value).toFixed(1) + '%';
  return new Intl.NumberFormat('en-US').format(value);
}

export function appendBadge(parentEl, value, color = null) {
  if (!value) {
    html.take(parentEl).span.className('text-gray-400 text-sm').text('—');
    return;
  }
  const cls = color || STATUS_COLORS[String(value).toLowerCase()] || 'bg-gray-100 text-gray-700';
  html.take(parentEl).span
    .className('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium')
    .className(cls)
    .text(String(value));
}
