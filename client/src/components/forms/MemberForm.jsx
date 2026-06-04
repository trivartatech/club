import { useState, useEffect } from 'react';
import { STATUSES, GENDERS } from '../../utils/formatters';
import { checkPhone } from '../../api/membersApi';

export default function MemberForm({ values, onChange, isEdit = false, isAdminOrStaff = true, memberId, originalPhone, onPhoneTaken }) {
  const set = (field) => (e) => onChange({ ...values, [field]: e.target.value });

  // Live duplicate-phone check.
  const [phoneCheck, setPhoneCheck] = useState({ state: 'idle', member: null });
  const phone = (values.phone || '').trim();

  useEffect(() => {
    const digits = phone.replace(/\D/g, '');
    // No check needed if empty, too short, or unchanged from the member's own number.
    const skip = !digits || digits.length < 6 || (originalPhone && digits === String(originalPhone).replace(/\D/g, ''));
    const t = setTimeout(() => {
      if (skip) {
        setPhoneCheck({ state: 'idle', member: null });
        onPhoneTaken?.(false);
        return;
      }
      setPhoneCheck({ state: 'checking', member: null });
      checkPhone(phone, memberId)
        .then((r) => {
          const { available, member } = r.data.data;
          setPhoneCheck({ state: available ? 'ok' : 'taken', member });
          onPhoneTaken?.(!available);
        })
        .catch(() => { setPhoneCheck({ state: 'idle', member: null }); onPhoneTaken?.(false); });
    }, skip ? 0 : 400);
    return () => clearTimeout(t);
  }, [phone, memberId, originalPhone]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      {/* Personal Info */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Personal Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Full Name *</label>
            <input className="input" required value={values.full_name || ''} onChange={set('full_name')} placeholder="e.g. Ravi Kumar" />
          </div>
          <div>
            <label className="label">Gender</label>
            <select className="input" value={values.gender || ''} onChange={set('gender')}>
              <option value="">Select gender</option>
              {GENDERS.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date of Birth</label>
            <input type="date" className="input" value={values.date_of_birth || ''} onChange={set('date_of_birth')} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input
              type="tel"
              className={`input ${phoneCheck.state === 'taken' ? '!border-red-400 !ring-red-300' : ''}`}
              value={values.phone || ''}
              onChange={set('phone')}
              placeholder="10-digit mobile number"
            />
            {phoneCheck.state === 'checking' && <p className="text-xs text-gray-400 mt-1">Checking…</p>}
            {phoneCheck.state === 'taken' && (
              <p className="text-xs text-red-600 mt-1">
                ⚠ Already used by <span className="font-semibold">{phoneCheck.member?.full_name}</span> ({phoneCheck.member?.member_number}). Use a different number.
              </p>
            )}
          </div>
          <div>
            <label className="label">Secondary Phone</label>
            <input type="tel" className="input" value={values.phone_secondary || ''} onChange={set('phone_secondary')} placeholder="Alternate number (optional)" />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={values.email || ''} onChange={set('email')} placeholder="email@example.com" />
          </div>
        </div>
      </div>

      {/* Address */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Address</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">House No.</label>
            <input className="input" value={values.house_no || ''} onChange={set('house_no')} placeholder="House / Door No." />
          </div>
          <div>
            <label className="label">Street</label>
            <input className="input" value={values.street || ''} onChange={set('street')} placeholder="Street / Area" />
          </div>
          <div>
            <label className="label">City</label>
            <input className="input" value={values.city || 'Chitradurga'} onChange={set('city')} />
          </div>
          <div>
            <label className="label">PIN Code</label>
            <input className="input" value={values.pin_code || '577501'} onChange={set('pin_code')} placeholder="577501" />
          </div>
        </div>
      </div>

      {/* Membership — admin/staff only for some fields */}
      {isAdminOrStaff && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Membership</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!isEdit && (
              <div className="sm:col-span-2">
                <label className="label">Member Number</label>
                <input
                  className="input font-mono"
                  value={values.member_number || ''}
                  onChange={set('member_number')}
                  placeholder="Auto-generated if left blank"
                />
                <p className="text-xs text-gray-400 mt-1">Suggested automatically — edit if you need a custom number. Must be unique.</p>
              </div>
            )}
            <div>
              <label className="label">Join Date</label>
              <input type="date" className="input" value={values.join_date || ''} onChange={set('join_date')} />
            </div>
            {isEdit && (
              <div>
                <label className="label">Status</label>
                <select className="input" value={values.status || 'Active'} onChange={set('status')}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Emergency Contact */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Emergency Contact</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Name</label>
            <input className="input" value={values.emergency_contact_name || ''} onChange={set('emergency_contact_name')} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input type="tel" className="input" value={values.emergency_contact_phone || ''} onChange={set('emergency_contact_phone')} />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="label">Notes / Remarks</label>
        <textarea
          className="input"
          rows={3}
          value={values.notes || ''}
          onChange={set('notes')}
          placeholder="Any additional notes..."
        />
      </div>
    </div>
  );
}
