import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUser } from '../../api/usersApi';
import { getMembers } from '../../api/membersApi';
import { useToast } from '../../components/common/Toast';

export default function UserCreate() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'staff', member_id: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMembers({ limit: 500 }).then(r => setMembers(r.data.data));
  }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await createUser({ ...form, member_id: form.member_id || null });
      addToast('User account created');
      navigate('/admin/users');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create user', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div>
          <label className="label">Username *</label>
          <input className="input" required value={form.username} onChange={set('username')} placeholder="unique username" />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" className="input" value={form.email} onChange={set('email')} />
        </div>
        <div>
          <label className="label">Password *</label>
          <input type="password" className="input" required minLength={6} value={form.password} onChange={set('password')} />
          <div className="text-xs text-gray-400 mt-1">Minimum 6 characters. User will be prompted to change on first login.</div>
        </div>
        <div>
          <label className="label">Role *</label>
          <select className="input" value={form.role} onChange={set('role')}>
            <option value="staff">Staff</option>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {form.role === 'member' && (
          <div>
            <label className="label">Link to Member</label>
            <select className="input" value={form.member_id} onChange={set('member_id')}>
              <option value="">Select member...</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.full_name} — {m.member_number}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Creating...' : 'Create Account'}</button>
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </form>
  );
}
