// Minimal but robust CSV parser: handles quoted fields, escaped quotes ("")
// and commas/newlines inside quotes. Returns an array of string-arrays (rows).
export function parseCsvRows(text) {
  const rows = [];
  let cur = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; }
        else inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      cur.push(field); field = '';
    } else if (ch === '\r') {
      // ignore — handled with \n
    } else if (ch === '\n') {
      cur.push(field); rows.push(cur); cur = []; field = '';
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }

  // Drop fully empty rows
  return rows.filter(r => r.some(c => c.trim() !== ''));
}

// Normalise a header label to a snake_case key (e.g. "Full Name" -> "full_name").
export function normalizeKey(h) {
  return String(h).trim().toLowerCase().replace(/[\s-]+/g, '_');
}

// Maps many real-world header variants onto our member field keys.
const HEADER_ALIASES = {
  name: 'full_name', full_name: 'full_name', member_name: 'full_name',
  adress: 'street', address: 'street', addr: 'street',
  contact_no: 'phone', contact: 'phone', contact_number: 'phone', mobile: 'phone', mobile_number: 'phone', phone: 'phone', phone_number: 'phone', phone_no: 'phone',
  phone_secondary: 'phone_secondary', alternate_phone: 'phone_secondary',
  member_id: 'member_number', memberid: 'member_number', member_number: 'member_number', membership_no: 'member_number', membership_number: 'member_number',
  doj: 'join_date', join_date: 'join_date', joining_date: 'join_date', date_of_joining: 'join_date', join_of_the_date: 'join_date',
  email: 'email', gender: 'gender', dob: 'date_of_birth', date_of_birth: 'date_of_birth',
  house_no: 'house_no', street: 'street', city: 'city', pin_code: 'pin_code', pincode: 'pin_code',
  general_since: 'general_since', lifetime_since: 'lifetime_since',
  emergency_contact_name: 'emergency_contact_name', emergency_contact_phone: 'emergency_contact_phone',
  notes: 'notes', remarks: 'notes', membership_type: 'membership_type', type: 'membership_type',
  // Ignored
  sl_no: null, sl: null, sr_no: null, photo: null, photos: null, '': null,
};

function toDateStr(v) {
  if (v == null || v === '') return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  if (/^\d{4}$/.test(s)) return `${s}-01-01`;        // bare year -> Jan 1
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(s)) return s.slice(0, 10);
  return s;
}

const normPhone = (v) => String(v ?? '').replace(/[^\d+]/g, '');

/**
 * Turn a matrix (first row = headers) into member objects, mapping known header
 * variants to our field keys and normalising phones/dates. `forceType` (if not
 * 'auto') overrides membership_type for every row.
 */
export function mapRowsToMembers(matrix, forceType = 'auto') {
  if (!matrix || matrix.length < 2) return [];
  const headers = matrix[0].map(normalizeKey);
  const out = [];
  for (let i = 1; i < matrix.length; i += 1) {
    const cols = matrix[i];
    if (!cols.some((c) => String(c ?? '').trim() !== '')) continue;
    const m = {};
    headers.forEach((hk, idx) => {
      const target = HEADER_ALIASES[hk];
      if (!target) return;
      let val = cols[idx];
      if (target === 'phone' || target === 'phone_secondary') val = normPhone(val);
      else if (['join_date', 'general_since', 'lifetime_since', 'date_of_birth'].includes(target)) val = toDateStr(val);
      else val = String(val ?? '').replace(/\s+/g, ' ').trim();
      if (val !== '') m[target] = val;
    });
    if (forceType && forceType !== 'auto') m.membership_type = forceType;
    out.push(m);
  }
  return out;
}

// Parse CSV text into an array of objects keyed by the (normalised) header row.
export function parseCsvToObjects(text) {
  const rows = parseCsvRows(text);
  if (rows.length < 2) return { headers: rows[0] || [], objects: [] };
  const headers = rows[0].map(normalizeKey);
  const objects = rows.slice(1).map((cols) => {
    const obj = {};
    headers.forEach((key, idx) => { obj[key] = (cols[idx] ?? '').trim(); });
    return obj;
  });
  return { headers, objects };
}
