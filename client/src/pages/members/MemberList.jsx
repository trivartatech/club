import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMembers } from '../../api/membersApi';
import { formatDate } from '../../utils/formatters';
import { MemberTypeBadge, StatusBadge } from '../../components/common/StatusBadge';
import Avatar from '../../components/common/Avatar';

export default function MemberList() {
  const navigate = useNavigate();
  const [data, setData] = useState({ data: [], pagination: {} });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', status: '', membership_type: '', page: 1, limit: 20, sort: 'full_name', order: 'asc' });

  const load = useCallback(() => {
    setLoading(true);
    getMembers(filters)
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setFilters(f => ({ ...f, [k]: v, page: 1 }));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <input
            type="search"
            placeholder="Search name, number, phone..."
            value={filters.search}
            onChange={e => set('search', e.target.value)}
            className="input !w-64"
          />
          <select className="input !w-36" value={filters.status} onChange={e => set('status', e.target.value)}>
            <option value="">All Status</option>
            <option>Active</option><option>Inactive</option><option>Suspended</option>
          </select>
          <select className="input !w-36" value={filters.membership_type} onChange={e => set('membership_type', e.target.value)}>
            <option value="">All Types</option>
            <option>New</option><option>General</option><option>Lifetime</option>
          </select>
        </div>
        <Link to="/members/new" className="btn-primary">+ Add Member</Link>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Member No.</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Phone</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Joined</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">Loading...</td></tr>
              )}
              {!loading && data.data.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">No members found</td></tr>
              )}
              {!loading && data.data.map(m => (
                <tr key={m.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/members/${m.id}`)}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{m.member_number}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={m.photo_url} name={m.full_name} size="sm" />
                      <span className="font-medium text-gray-900">{m.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{m.phone || '—'}</td>
                  <td className="px-4 py-3"><MemberTypeBadge type={m.membership_type} /></td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(m.join_date)}</td>
                  <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data.pagination?.pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
            <span>Showing {((filters.page - 1) * filters.limit) + 1}–{Math.min(filters.page * filters.limit, data.pagination.total)} of {data.pagination.total}</span>
            <div className="flex gap-2">
              <button disabled={filters.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))} className="btn-sm">← Prev</button>
              <button disabled={filters.page >= data.pagination.pages} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))} className="btn-sm">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
