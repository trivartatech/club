import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMemberPayments } from '../../api/paymentsApi';
import { getMember } from '../../api/membersApi';
import { formatDate, formatCurrency, PAYMENT_TYPE_LABELS } from '../../utils/formatters';

export default function MemberPayments() {
  const { member_id } = useParams();
  const [member, setMember] = useState(null);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    getMember(member_id).then(r => setMember(r.data.data)).catch(() => {});
    getMemberPayments(member_id).then(r => setPayments(r.data.data)).catch(() => {});
  }, [member_id]);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {member && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <div className="font-semibold">{member.full_name}</div>
            <div className="text-xs text-gray-500 font-mono">{member.member_number}</div>
          </div>
          <Link to={`/members/${member_id}`} className="btn-secondary text-xs">View Profile</Link>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold">Payment History ({payments.length})</h3>
        </div>
        {payments.length === 0 ? (
          <div className="text-center py-10 text-gray-400">No payments recorded</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {payments.map(p => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="font-mono text-xs text-gray-500">{p.receipt_number}</div>
                  <div className="text-sm font-medium mt-0.5">{PAYMENT_TYPE_LABELS[p.payment_type]}{p.payment_month ? ` — ${p.payment_month}` : ''}</div>
                  <div className="text-xs text-gray-400">{formatDate(p.payment_date)}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm font-semibold">{formatCurrency(p.amount)}</div>
                  <Link to={`/reports/receipt/${p.id}`} className="text-xs text-primary-600 hover:underline">Receipt</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
