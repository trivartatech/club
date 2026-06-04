import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getReceipt } from '../../api/paymentsApi';
import { formatDate, formatCurrency, PAYMENT_TYPE_LABELS } from '../../utils/formatters';

export default function Receipt() {
  const { id } = useParams();
  const [payment, setPayment] = useState(null);

  useEffect(() => {
    getReceipt(id).then(r => setPayment(r.data.data)).catch(() => {});
  }, [id]);

  if (!payment) return <div className="text-gray-400">Loading receipt...</div>;

  return (
    <div className="max-w-md mx-auto">
      <div className="no-print flex justify-between items-center mb-4">
        <Link to={-1} className="btn-secondary text-xs">← Back</Link>
        <button onClick={() => window.print()} className="btn-primary text-xs">🖨️ Print Receipt</button>
      </div>

      <div id="receipt" className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 print:shadow-none print:border-none print:rounded-none">
        {/* Header */}
        <div className="text-center mb-6 pb-4 border-b-2 border-gray-200">
          <div className="text-2xl mb-1">🏛️</div>
          <div className="text-xl font-bold uppercase tracking-wide">Chitradurga City Club</div>
          <div className="text-sm text-gray-500">Chitradurga — 577501, Karnataka</div>
          <div className="mt-3 text-xs text-gray-400 uppercase tracking-wider">Official Receipt</div>
        </div>

        {/* Receipt number & date */}
        <div className="flex justify-between mb-5 text-sm">
          <div>
            <div className="text-gray-400 text-xs uppercase">Receipt No.</div>
            <div className="font-bold font-mono text-lg">{payment.receipt_number}</div>
          </div>
          <div className="text-right">
            <div className="text-gray-400 text-xs uppercase">Date</div>
            <div className="font-medium">{formatDate(payment.payment_date)}</div>
          </div>
        </div>

        {/* Member info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-5 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Member Name</span>
            <span className="font-medium">{payment.full_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Member No.</span>
            <span className="font-mono">{payment.member_number}</span>
          </div>
          {payment.phone && (
            <div className="flex justify-between">
              <span className="text-gray-500">Phone</span>
              <span>{payment.phone}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">Membership</span>
            <span>{payment.membership_type}</span>
          </div>
        </div>

        {/* Payment details */}
        <div className="space-y-2 text-sm mb-5">
          <div className="flex justify-between">
            <span className="text-gray-500">Payment For</span>
            <span className="font-medium">{PAYMENT_TYPE_LABELS[payment.payment_type]}</span>
          </div>
          {payment.payment_month && (
            <div className="flex justify-between">
              <span className="text-gray-500">Month</span>
              <span>{payment.payment_month}</span>
            </div>
          )}
          {payment.notes && (
            <div className="flex justify-between">
              <span className="text-gray-500">Notes</span>
              <span className="text-right max-w-xs">{payment.notes}</span>
            </div>
          )}
        </div>

        {/* Amount */}
        <div className="border-t-2 border-gray-200 pt-4 flex justify-between items-center">
          <span className="font-semibold text-gray-700">Amount Received</span>
          <span className="text-2xl font-bold text-gray-900">{formatCurrency(payment.amount)}</span>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-400 text-center">
          <div>Recorded by: {payment.recorded_by_name}</div>
          <div className="mt-1">This is a computer-generated receipt.</div>
        </div>
      </div>
    </div>
  );
}
