export function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatCurrency(amount) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export function formatMonth(yyyymm) {
  if (!yyyymm) return '—';
  const [y, m] = yyyymm.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

// Build a member-number preview from a format config (mirrors the server logic).
export function buildMemberNumberPreview(cfg, seq, year = new Date().getFullYear()) {
  const sep = cfg.separator || '';
  const pad = String(seq).padStart(Math.max(1, Number(cfg.padding) || 1), '0');
  if (cfg.mode === 'alpha') {
    const parts = [];
    if (cfg.prefix) parts.push(cfg.prefix);
    if (cfg.code) parts.push(cfg.code);
    parts.push('A'); // sample name initial
    parts.push(pad);
    let s = parts.join(sep);
    if (cfg.suffix) s += sep + cfg.suffix;
    return s;
  }
  const parts = [];
  if (cfg.prefix) parts.push(cfg.prefix);
  if (cfg.include_year) parts.push(String(year));
  parts.push(pad);
  if (cfg.suffix) parts.push(cfg.suffix);
  return parts.join(sep);
}

export const MEMBERSHIP_TYPES = ['New', 'General', 'Lifetime'];
export const STATUSES = ['Active', 'Inactive', 'Suspended'];
export const GENDERS = ['Male', 'Female', 'Other'];
export const PAYMENT_TYPES = ['joining', 'monthly', 'lifetime_transfer'];

export const PAYMENT_TYPE_LABELS = {
  joining: 'Joining Fee',
  monthly: 'Monthly Dues',
  lifetime_transfer: 'Lifetime Transfer Fee',
};

export const TYPE_COLORS = {
  New: 'bg-yellow-100 text-yellow-800',
  General: 'bg-blue-100 text-blue-800',
  Lifetime: 'bg-purple-100 text-purple-800',
};

export const STATUS_COLORS = {
  Active: 'bg-green-100 text-green-800',
  Inactive: 'bg-gray-100 text-gray-600',
  Suspended: 'bg-red-100 text-red-800',
};
