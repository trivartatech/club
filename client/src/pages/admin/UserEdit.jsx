import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getUser, updateUser, resetPassword } from '../../api/usersApi';
import { getMembers } from '../../api/membersApi';
import { useToast } from '../../components/common/Toast';

export default function UserEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState(null);
  const [newPass, setNewPass] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getUser(id).then(r => {
      const u = r.data.data;
      setForm({ email: u.email || '', role: u.role, member_id: u.member_id || '', is_active: u.is_active });
    });
    getMembers({ limit: 500 }).then(r => setMembers(r.data.data));
  }, [id]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUser(id, { ...form, member_id: form.member_id || null });
      addToast('User updated');
      navigate('/admin/users');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword() {
    if (!newPass || newPass.length < 6) { addToast('Password must be at least 6 characters', 'error'); return; }
    if (!confirm('Reset this user\'s password?')) return;
    try {
      await resetPassword(id, { new_password: newPass });
      addToast('Password reset successfully');
      setNewPass('');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed', 'error');
    }
  }

  if (!form) return <div className="text-gray-400">Loading...</div>;

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <form onSubmit={handleSave}>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h3 className="font-semibold">Update Account</h3>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={form.email} onChange={set('email')} />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={set('role')}>
              <option value="staff">Staff</option>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="label">Linked Member</label>
            <select className="input" value={form.member_id} onChange={set('member_id')}>
              <option value="">None</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.full_name} — {m.member_number}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Account Status</label>
            <select className="input" value={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: Number(e.target.value) }))}>
              <option value={1}>Active</option>
              <option value={0}>Inactive</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button>
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-3">
        <h3 className="font-semibold">Reset Password</h3>
        <input type="password" className="input" placeholder="New password (min 6 chars)" minLength={6} value={newPass} onChange={e => setNewPass(e.target.value)} />
        <button onClick={handleResetPassword} className="btn-secondary text-sm text-red-700 border-red-300">Reset Password</button>
      </div>
    </div>
  );
}
