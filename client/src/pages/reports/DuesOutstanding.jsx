import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDuesOutstanding } from '../../api/usersApi';
import { currentMonth } from '../../utils/formatters';
import { MemberTypeBadge } from '../../components/common/StatusBadge';

export default function DuesOutstanding() {
  const [data, setData] = useState(null);
  const [month, setMonth] = useState(currentMonth());

  useEffect(() => {
    getDuesOutstanding({ month }).then(r => setData(r.data.data)).catch(() => {});
  }, [month]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Month:</label>
        <input type="month" className="input !w-44" value={month} onChange={e => setMonth(e.target.value)} />
        {data && <span className="text-sm text-gray-500">{data.count} members outstanding</span>}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Member No.</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Phone</th>
                <th className="text-left px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!data && <tr><td colSpan={5} className="text-center py-8 text-gray-400">Loading...</td></tr>}
              {data?.count === 0 && <tr><td colSpan={5} className="text-center py-8 text-green-600">All dues paid for this month ✓</td></tr>}
              {data?.members.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{m.member_number}</td>
                  <td className="px-4 py-3 font-medium">
                    <Link to={`/members/${m.id}`} className="text-primary-700 hover:underline">{m.full_name}</Link>
                  </td>
                  <td className="px-4 py-3"><MemberTypeBadge type={m.membership_type} /></td>
                  <td className="px-4 py-3 text-gray-500">{m.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <Link
                      to="/payments/record"
                      state={{ member_id: String(m.id), member_name: m.full_name }}
                      className="text-xs text-primary-600 hover:underline"
                    >
                      Record Payment →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
