import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getPayments } from '../../api/paymentsApi';
import { formatDate, formatCurrency, PAYMENT_TYPE_LABELS } from '../../utils/formatters';
import Avatar from '../../components/common/Avatar';

export default function PaymentHistory() {
  const [data, setData] = useState({ data: [], pagination: {} });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ page: 1, limit: 20, payment_type: '', month: '' });

  const load = useCallback(() => {
    setLoading(true);
    getPayments(filters).then(r => setData(r.data)).finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setFilters(f => ({ ...f, [k]: v, page: 1 }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select className="input !w-44" value={filters.payment_type} onChange={e => set('payment_type', e.target.value)}>
          <option value="">All Types</option>
          {Object.entries(PAYMENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input type="month" className="input !w-44" value={filters.month} onChange={e => set('month', e.target.value)} />
        {filters.month && (
          <button className="btn-secondary text-xs" onClick={() => set('month', '')}>Clear month</button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Receipt No.</th>
                <th className="text-left px-4 py-3">Member</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Month</th>
                <th className="text-left px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Loading...</td></tr>}
              {!loading && data.data.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">No payments found</td></tr>}
              {!loading && data.data.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.receipt_number}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={p.photo_url} name={p.full_name} size="sm" />
                      <div>
                        <Link to={`/members/${p.member_id}`} className="text-primary-700 hover:underline">{p.full_name}</Link>
                        <div className="text-xs text-gray-400">{p.member_number}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{PAYMENT_TYPE_LABELS[p.payment_type]}</td>
                  <td className="px-4 py-3 text-gray-500">{p.payment_month || '—'}</td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(p.amount)}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(p.payment_date)}</td>
                  <td className="px-4 py-3">
                    <Link to={`/reports/receipt/${p.id}`} className="text-xs text-primary-600 hover:underline">Receipt</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.pagination?.pages > 1 && (
          <div className="px-4 py-3 border-t flex items-center justify-between text-sm text-gray-600">
            <span>{data.pagination.total} payments</span>
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
