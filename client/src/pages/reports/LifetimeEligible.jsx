import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getLifetimeEligible } from '../../api/usersApi';
import { formatDate } from '../../utils/formatters';

export default function LifetimeEligible() {
  const [data, setData] = useState(null);

  useEffect(() => {
    getLifetimeEligible().then(r => setData(r.data.data)).catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
        Members who have been General members for 1+ year and are eligible for Lifetime membership upgrade.
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold">Eligible Members {data ? `(${data.count})` : ''}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Member No.</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">General Since</th>
                <th className="text-left px-4 py-3">Days as General</th>
                <th className="text-left px-4 py-3">Phone</th>
                <th className="text-left px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!data && <tr><td colSpan={6} className="text-center py-8 text-gray-400">Loading...</td></tr>}
              {data?.count === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">No eligible members at this time.</td></tr>}
              {data?.members.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{m.member_number}</td>
                  <td className="px-4 py-3 font-medium">
                    <Link to={`/members/${m.id}`} className="text-primary-700 hover:underline">{m.full_name}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(m.general_since)}</td>
                  <td className="px-4 py-3">
                    <span className="text-purple-700 font-medium">{Math.floor(m.days_as_general)} days</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{m.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <Link to={`/members/${m.id}`} className="text-xs text-primary-600 hover:underline">View / Upgrade →</Link>
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
