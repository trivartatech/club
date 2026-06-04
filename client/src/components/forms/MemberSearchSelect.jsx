import { useState, useEffect, useRef } from 'react';
import { getMembers } from '../../api/membersApi';

// Searchable member picker — looks up members by name, member ID or phone.
export default function MemberSearchSelect({ selected, onSelect, autoFocus }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const blurTimer = useRef(null);

  useEffect(() => {
    const q = query.trim();
    const t = setTimeout(() => {
      if (!q) { setResults([]); setOpen(false); setLoading(false); return; }
      setLoading(true);
      getMembers({ search: q, status: 'Active', limit: 15, sort: 'full_name', order: 'asc' })
        .then((r) => { setResults(r.data.data); setOpen(true); })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [query]);

  if (selected) {
    return (
      <div className="flex items-center justify-between border border-gray-300 rounded-lg px-3 py-2 bg-gray-50">
        <div>
          <div className="font-medium text-sm">{selected.full_name}</div>
          <div className="text-xs text-gray-500 font-mono">
            {selected.member_number}{selected.phone ? ` · ${selected.phone}` : ''}
          </div>
        </div>
        <button type="button" onClick={() => onSelect(null)} className="text-xs text-primary-600 hover:underline">Change</button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        className="input"
        placeholder="Search by name, member ID or phone…"
        value={query}
        autoFocus={autoFocus}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => { if (results.length) setOpen(true); }}
        onBlur={() => { blurTimer.current = setTimeout(() => setOpen(false), 150); }}
      />
      {open && (
        <div
          className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
          onMouseDown={() => clearTimeout(blurTimer.current)}
        >
          {loading && <div className="px-3 py-2 text-xs text-gray-400">Searching…</div>}
          {!loading && results.length === 0 && <div className="px-3 py-2 text-xs text-gray-400">No members found</div>}
          {results.map((m) => (
            <button
              type="button"
              key={m.id}
              onClick={() => { onSelect(m); setOpen(false); setQuery(''); }}
              className="w-full text-left px-3 py-2 hover:bg-primary-50 border-b border-gray-50 last:border-0"
            >
              <div className="text-sm font-medium">{m.full_name}</div>
              <div className="text-xs text-gray-500 font-mono">
                {m.member_number}{m.phone ? ` · ${m.phone}` : ''} · {m.membership_type}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
