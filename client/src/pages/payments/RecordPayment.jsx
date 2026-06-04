import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { recordPayment, getFeeConfig } from '../../api/paymentsApi';
import { useToast } from '../../components/common/Toast';
import { getMember } from '../../api/membersApi';
import MemberSearchSelect from '../../components/forms/MemberSearchSelect';
import { currentMonth, PAYMENT_TYPE_LABELS } from '../../utils/formatters';

export default function RecordPayment() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const [feeConfig, setFeeConfig] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [form, setForm] = useState({
    member_id: location.state?.member_id || '',
    payment_type: 'monthly',
    amount: '',
    payment_month: currentMonth(),
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  function pickMember(m) {
    setSelectedMember(m);
    setForm(f => ({ ...f, member_id: m ? m.id : '' }));
  }

  useEffect(() => {
    getFeeConfig().then(r => setFeeConfig(r.data.data));
    // Pre-select the member if we arrived here from their detail page.
    if (location.state?.member_id) {
      getMember(location.state.member_id).then(r => pickMember(r.data.data)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!feeConfig) return;
    const amounts = {
      joining: feeConfig.joining_fee,
      monthly: feeConfig.monthly_due_general,
      lifetime_transfer: feeConfig.lifetime_transfer_fee,
    };
    setForm(f => ({ ...f, amount: amounts[f.payment_type] || '' }));
  }, [form.payment_type, feeConfig]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.member_id) { addToast('Please select a member', 'error'); return; }
    setSaving(true);
    try {
      const res = await recordPayment(form);
      addToast(`Payment recorded — ${res.data.data.receipt_number}`);
      navigate(`/reports/receipt/${res.data.data.id}`);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to record payment', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        <div>
          <label className="label">Member *</label>
          <MemberSearchSelect selected={selectedMember} onSelect={pickMember} autoFocus={!location.state?.member_id} />
        </div>

        <div>
          <label className="label">Payment Type *</label>
          <select className="input" required value={form.payment_type} onChange={set('payment_type')}>
            {Object.entries(PAYMENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {form.payment_type === 'monthly' && (
          <div>
            <label className="label">Month *</label>
            <input type="month" className="input" required value={form.payment_month} onChange={set('payment_month')} />
          </div>
        )}

        <div>
          <label className="label">Amount (₹) *</label>
          <input type="number" min={0} step={0.01} className="input" required value={form.amount} onChange={set('amount')} />
          {feeConfig && (
            <div className="text-xs text-gray-400 mt-1">
              Standard: Joining ₹{feeConfig.joining_fee} | Monthly (General) ₹{feeConfig.monthly_due_general} | Monthly (Lifetime) ₹{feeConfig.monthly_due_lifetime} | Transfer ₹{feeConfig.lifetime_transfer_fee}
            </div>
          )}
        </div>

        <div>
          <label className="label">Payment Date *</label>
          <input type="date" className="input" required value={form.payment_date} onChange={set('payment_date')} />
        </div>

        <div>
          <label className="label">Notes</label>
          <input type="text" className="input" value={form.notes} onChange={set('notes')} placeholder="Optional notes" />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Record Payment'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </form>
  );
}
