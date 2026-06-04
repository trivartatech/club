import { useState, useEffect } from 'react';
import { getFeeConfig, updateFeeConfig } from '../../api/paymentsApi';
import { useToast } from '../../components/common/Toast';
import { formatCurrency } from '../../utils/formatters';

export default function FeeConfig() {
  const { addToast } = useToast();
  const [form, setForm] = useState({ joining_fee: '', monthly_due_general: '', monthly_due_lifetime: '', lifetime_transfer_fee: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getFeeConfig().then(r => {
      const d = r.data.data;
      setForm({
        joining_fee: d.joining_fee,
        monthly_due_general: d.monthly_due_general,
        monthly_due_lifetime: d.monthly_due_lifetime,
        lifetime_transfer_fee: d.lifetime_transfer_fee,
      });
    }).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateFeeConfig(form);
      addToast('Fee configuration saved');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        <p className="text-sm text-gray-600">Set the standard fee amounts. These are used as defaults when recording payments.</p>

        {[
          { key: 'joining_fee', label: 'Joining Fee (one-time)' },
          { key: 'monthly_due_general', label: 'Monthly Dues — General Members' },
          { key: 'monthly_due_lifetime', label: 'Monthly Dues — Lifetime Members' },
          { key: 'lifetime_transfer_fee', label: 'Lifetime Transfer Fee (one-time)' },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="label">{label}</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-400 text-sm">₹</span>
              <input
                type="number"
                min={0}
                step={1}
                required
                className="input pl-7"
                value={form[key]}
                onChange={set(key)}
              />
            </div>
          </div>
        ))}

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? 'Saving...' : 'Save Fee Configuration'}
        </button>
      </div>
    </form>
  );
}
