import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getMember, deleteMember, upgradeToGeneral, upgradeToLifetime, uploadPhoto } from '../../api/membersApi';
import { getMemberPayments } from '../../api/paymentsApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { MemberTypeBadge, StatusBadge } from '../../components/common/StatusBadge';
import PhotoCropModal from '../../components/common/PhotoCropModal';

function Field({ label, value }) {
  return (
    <div>
      <div className="text-xs text-gray-400 uppercase tracking-wider">{label}</div>
      <div className="text-sm text-gray-900 mt-0.5">{value || '—'}</div>
    </div>
  );
}

export default function MemberDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isAdminOrStaff } = useAuth();
  const { addToast } = useToast();
  const [member, setMember] = useState(null);
  const [payments, setPayments] = useState([]);
  const [cropSrc, setCropSrc] = useState(null);
  const photoRef = useRef();

  const load = () => {
    getMember(id).then(r => setMember(r.data.data)).catch(() => navigate('/members'));
    getMemberPayments(id).then(r => setPayments(r.data.data.slice(0, 5))).catch(() => {});
  };

  useEffect(() => { load(); }, [id]);

  async function handleDelete() {
    if (!confirm(`Deactivate ${member.full_name}?`)) return;
    try {
      await deleteMember(id);
      addToast('Member deactivated');
      navigate('/members');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to deactivate member', 'error');
    }
  }

  async function handleUpgradeGeneral() {
    if (!confirm('Upgrade this member to General?')) return;
    try {
      await upgradeToGeneral(id);
      addToast('Member upgraded to General');
      load();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to upgrade member', 'error');
    }
  }

  async function handleUpgradeLifetime() {
    if (!confirm('Upgrade this member to Lifetime?')) return;
    try {
      await upgradeToLifetime(id);
      addToast('Member upgraded to Lifetime');
      load();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to upgrade member', 'error');
    }
  }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropSrc(URL.createObjectURL(file));
    e.target.value = '';
  }

  async function handleCropped(file) {
    setCropSrc(null);
    const fd = new FormData();
    fd.append('photo', file);
    try {
      await uploadPhoto(id, fd);
      addToast('Photo updated');
      load();
    } catch {
      addToast('Photo upload failed', 'error');
    }
  }

  if (!member) return <div className="text-gray-400">Loading...</div>;

  const digits = (s) => String(s || '').replace(/\D/g, '');
  const loginType = member.login_username
    ? (digits(member.login_username) && digits(member.login_username) === digits(member.phone)
        ? 'phone number'
        : (member.login_username === member.member_number ? 'member number' : 'custom'))
    : null;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start gap-5">
          <div
            className="relative cursor-pointer group"
            onClick={() => isAdminOrStaff() && photoRef.current?.click()}
          >
            <div className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-3xl">
              {member.photo_url
                ? <img src={member.photo_url} alt="" className="w-full h-full object-cover" />
                : '👤'}
            </div>
            {isAdminOrStaff() && (
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-xs">📷</span>
              </div>
            )}
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">{member.full_name}</h2>
                <div className="text-sm text-gray-500 font-mono mt-0.5">{member.member_number}</div>
                {member.previous_member_number && (
                  <div className="text-xs text-gray-400 font-mono mt-0.5">was {member.previous_member_number}</div>
                )}
                <div className="flex gap-2 mt-2">
                  <MemberTypeBadge type={member.membership_type} />
                  <StatusBadge status={member.status} />
                </div>
              </div>
              {isAdminOrStaff() && (
                <div className="flex flex-wrap gap-2">
                  <Link to={`/members/${id}/edit`} className="btn-secondary text-xs">Edit</Link>
                  <Link to={`/members/${id}/id-card`} className="btn-secondary text-xs">🪪 ID Card</Link>
                  <Link to="/payments/record" state={{ member_id: id, member_name: member.full_name }} className="btn-secondary text-xs">Record Payment</Link>
                  {isAdmin() && member.membership_type === 'New' && (
                    <button onClick={handleUpgradeGeneral} className="btn-secondary text-xs text-blue-700 border-blue-300">→ General</button>
                  )}
                  {isAdmin() && member.membership_type === 'General' && (
                    <button onClick={handleUpgradeLifetime} className="btn-secondary text-xs text-purple-700 border-purple-300">→ Lifetime</button>
                  )}
                  {isAdmin() && (
                    <button onClick={handleDelete} className="btn-secondary text-xs text-red-700 border-red-300">Deactivate</button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold mb-4">Member Details</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
          <Field label="Gender" value={member.gender} />
          <Field label="Date of Birth" value={formatDate(member.date_of_birth)} />
          <Field label="Phone" value={member.phone} />
          <Field label="Secondary Phone" value={member.phone_secondary} />
          <Field label="Email" value={member.email} />
          <Field label="Join Date" value={formatDate(member.join_date)} />
          <Field label="General Since" value={formatDate(member.general_since)} />
          <Field label="Lifetime Since" value={formatDate(member.lifetime_since)} />
          <Field label="Emergency Contact" value={member.emergency_contact_name} />
          <Field label="Emergency Phone" value={member.emergency_contact_phone} />
        </div>

        <div className="mt-4">
          <div className="text-xs text-gray-400 uppercase tracking-wider">Address</div>
          <div className="text-sm text-gray-900 mt-0.5">
            {[member.house_no, member.street, member.city, member.pin_code].filter(Boolean).join(', ') || '—'}
          </div>
        </div>

        {member.notes && (
          <div className="mt-4">
            <div className="text-xs text-gray-400 uppercase tracking-wider">Notes</div>
            <div className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{member.notes}</div>
          </div>
        )}

        {isAdminOrStaff() && member.login_username && (
          <div className="mt-5 bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Login</span>
            <div className="mt-0.5">
              <span className="text-gray-500">Username:</span>{' '}
              <span className="font-mono font-medium">{member.login_username}</span>{' '}
              <span className="text-xs text-gray-400">({loginType})</span>
            </div>
            {member.login_password_pending && (
              <div className="text-xs text-gray-500 mt-0.5">
                Initial password: <span className="font-mono">password</span> — member will be asked to change it on first login.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent payments */}
      {payments.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">Recent Payments</h3>
            <Link to={`/payments/member/${id}`} className="text-sm text-primary-700 hover:underline">View all →</Link>
          </div>
          <div className="space-y-2">
            {payments.map(p => (
              <div key={p.id} className="flex justify-between items-center text-sm py-2 border-b border-gray-50 last:border-0">
                <div>
                  <span className="font-mono text-xs text-gray-500">{p.receipt_number}</span>
                  <span className="mx-2 text-gray-300">|</span>
                  <span className="text-gray-700">{p.payment_type === 'joining' ? 'Joining Fee' : p.payment_type === 'lifetime_transfer' ? 'Lifetime Transfer' : `Monthly — ${p.payment_month}`}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">{formatCurrency(p.amount)}</span>
                  <Link to={`/reports/receipt/${p.id}`} className="text-xs text-primary-600 hover:underline">Receipt</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {cropSrc && (
        <PhotoCropModal imageSrc={cropSrc} onCancel={() => setCropSrc(null)} onCropped={handleCropped} />
      )}
    </div>
  );
}
