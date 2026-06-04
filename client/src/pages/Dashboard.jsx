import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSummary } from '../api/usersApi';
import { getMemberPayments } from '../api/paymentsApi';
import { getMember } from '../api/membersApi';
import { formatDate, formatCurrency, currentMonth, formatMonth } from '../utils/formatters';
import { MemberTypeBadge, StatusBadge } from '../components/common/StatusBadge';
import Avatar from '../components/common/Avatar';

function StatCard({ label, value, color = 'text-gray-900', sub }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { user, isAdminOrStaff, isMember } = useAuth();
  const [summary, setSummary] = useState(null);
  const [memberData, setMemberData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAdminOrStaff()) {
      getSummary()
        .then(r => setSummary(r.data.data))
        .catch(err => setError(err.response?.data?.message || 'Failed to load dashboard.'));
    }
    if (isMember() && user?.member_id) {
      getMember(user.member_id).then(r => setMemberData(r.data.data)).catch(() => {});
      getMemberPayments(user.member_id).then(r => setPayments(r.data.data.slice(0, 5))).catch(() => {});
    }
  }, []);

  if (isMember()) {
    const month = currentMonth();
    const paidThisMonth = payments.some(p => p.payment_type === 'monthly' && p.payment_month === month);
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-2xl overflow-hidden">
              {memberData?.photo_url
                ? <img src={memberData.photo_url} alt="" className="w-full h-full object-cover" />
                : '👤'}
            </div>
            <div>
              <div className="text-xl font-bold">{memberData?.full_name || user?.username}</div>
              <div className="text-sm text-gray-500">{memberData?.member_number}</div>
              {memberData && <MemberTypeBadge type={memberData.membership_type} />}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Phone:</span> {memberData?.phone || '—'}</div>
            <div><span className="text-gray-500">Email:</span> {memberData?.email || '—'}</div>
            <div><span className="text-gray-500">Joined:</span> {formatDate(memberData?.join_date)}</div>
            <div><span className="text-gray-500">Status:</span> {memberData && <StatusBadge status={memberData.status} />}</div>
          </div>
          <div className="mt-4 flex gap-3">
            <Link to="/profile" className="text-sm text-primary-700 hover:underline font-medium">Edit Profile →</Link>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold mb-3">This Month — {formatMonth(month)}</h3>
          {memberData?.membership_type === 'New' ? (
            <div className="text-sm text-yellow-700 bg-yellow-50 rounded-lg p-3">Pending joining fee payment. Please contact the club office.</div>
          ) : paidThisMonth ? (
            <div className="text-sm text-green-700 bg-green-50 rounded-lg p-3 font-medium">✓ Monthly dues paid for {formatMonth(month)}</div>
          ) : (
            <div className="text-sm text-red-700 bg-red-50 rounded-lg p-3">Monthly dues for {formatMonth(month)} are outstanding. Please contact the club office.</div>
          )}
        </div>

        {payments.length > 0 && (
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold mb-3">Recent Payments</h3>
            <div className="space-y-2">
              {payments.map(p => (
                <div key={p.id} className="flex justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="font-medium">{p.receipt_number}</div>
                    <div className="text-gray-500 text-xs">{formatDate(p.payment_date)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(p.amount)}</div>
                    <Link to={`/reports/receipt/${p.id}`} className="text-xs text-primary-600 hover:underline">View Receipt</Link>
                  </div>
                </div>
              ))}
            </div>
            <Link to={`/payments/member/${user?.member_id}`} className="text-sm text-primary-700 hover:underline mt-3 block">
              View all payments →
            </Link>
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
        {error}
      </div>
    );
  }
  if (!summary) return <div className="text-gray-400">Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Members" value={summary.counts.total} />
        <StatCard label="Active" value={summary.counts.active} color="text-green-700" />
        <StatCard label="General" value={summary.counts.type_general} color="text-blue-700" />
        <StatCard label="Lifetime" value={summary.counts.type_lifetime} color="text-purple-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatCard
          label="Monthly Dues Collected"
          value={formatCurrency(summary.monthly_collected)}
          color="text-green-700"
          sub={formatMonth(summary.current_month)}
        />
        <StatCard
          label="Dues Outstanding"
          value={summary.outstanding_dues_count}
          color={summary.outstanding_dues_count > 0 ? 'text-red-600' : 'text-green-700'}
          sub={<Link to="/reports/dues" className="text-primary-600 hover:underline text-xs">View list →</Link>}
        />
        <StatCard
          label="Lifetime Eligible"
          value={summary.lifetime_eligible_count}
          color="text-purple-700"
          sub={<Link to="/reports/lifetime-eligible" className="text-primary-600 hover:underline text-xs">View list →</Link>}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-semibold">Recent Members</h2>
          <Link to="/members" className="text-sm text-primary-700 hover:underline">View all →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-5 py-3">Member No.</th>
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-left px-5 py-3">Type</th>
                <th className="text-left px-5 py-3">Joined</th>
                <th className="text-left px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {summary.recent_members.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-xs text-gray-600">{m.member_number}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={m.photo_url} name={m.full_name} size="sm" />
                      <Link to={`/members/${m.id}`} className="text-primary-700 hover:underline font-medium">{m.full_name}</Link>
                    </div>
                  </td>
                  <td className="px-5 py-3"><MemberTypeBadge type={m.membership_type} /></td>
                  <td className="px-5 py-3 text-gray-500">{formatDate(m.join_date)}</td>
                  <td className="px-5 py-3"><StatusBadge status={m.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
