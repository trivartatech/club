import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMember, updateMember, uploadPhoto } from '../../api/membersApi';
import { changePassword } from '../../api/authApi';
import MemberForm from '../../components/forms/MemberForm';
import { useToast } from '../../components/common/Toast';
import { MemberTypeBadge, StatusBadge } from '../../components/common/StatusBadge';
import { formatDate } from '../../utils/formatters';
import PhotoCropModal from '../../components/common/PhotoCropModal';

export default function MyProfile() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [member, setMember] = useState(null);
  const [values, setValues] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [phoneTaken, setPhoneTaken] = useState(false);
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '' });
  const [changingPw, setChangingPw] = useState(false);
  const [cropSrc, setCropSrc] = useState(null);
  const photoRef = useRef();

  const load = () => {
    if (user?.member_id) {
      getMember(user.member_id).then(r => {
        setMember(r.data.data);
        setValues(r.data.data);
      });
    }
  };

  useEffect(() => { load(); }, [user]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateMember(user.member_id, values);
      addToast('Profile updated successfully');
      setEditing(false);
      load();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update', 'error');
    } finally {
      setSaving(false);
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
      await uploadPhoto(user.member_id, fd);
      addToast('Photo updated');
      load();
    } catch {
      addToast('Photo upload failed', 'error');
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    setChangingPw(true);
    try {
      await changePassword(pwForm);
      addToast('Password changed successfully');
      setPwForm({ current_password: '', new_password: '' });
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to change password', 'error');
    } finally {
      setChangingPw(false);
    }
  }

  if (!user?.member_id) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
          <div className="text-gray-500">Your account is not linked to a member record.</div>
          <div className="text-sm text-gray-400 mt-1">Please contact the club admin to link your account.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Profile header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-5">
          <div className="relative cursor-pointer group" onClick={() => photoRef.current?.click()}>
            <div className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-3xl">
              {member?.photo_url
                ? <img src={member.photo_url} alt="" className="w-full h-full object-cover" />
                : '👤'}
            </div>
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-white text-xs">📷</span>
            </div>
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>
          <div>
            <div className="text-xl font-bold">{member?.full_name}</div>
            <div className="text-sm font-mono text-gray-500">{member?.member_number}</div>
            <div className="flex gap-2 mt-2">
              {member && <MemberTypeBadge type={member.membership_type} />}
              {member && <StatusBadge status={member.status} />}
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-400">Joined:</span> {formatDate(member?.join_date)}</div>
          <div><span className="text-gray-400">Phone:</span> {member?.phone || '—'}</div>
          <div><span className="text-gray-400">Secondary Phone:</span> {member?.phone_secondary || '—'}</div>
          <div><span className="text-gray-400">Email:</span> {member?.email || '—'}</div>
          {member?.general_since && <div><span className="text-gray-400">General Since:</span> {formatDate(member.general_since)}</div>}
          {member?.lifetime_since && <div><span className="text-gray-400">Lifetime Since:</span> {formatDate(member.lifetime_since)}</div>}
        </div>
        {!editing && (
          <div className="mt-4 flex gap-2">
            <button onClick={() => setEditing(true)} className="btn-secondary text-sm">Edit My Details</button>
            <Link to={`/members/${user.member_id}/id-card`} className="btn-secondary text-sm">🪪 My ID Card</Link>
          </div>
        )}
      </div>

      {/* Edit form */}
      {editing && values && (
        <form onSubmit={handleSave}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
            <h3 className="font-semibold">Edit Profile</h3>
            <MemberForm values={values} onChange={setValues} isEdit={false} isAdminOrStaff={false} memberId={user.member_id} originalPhone={member?.phone} onPhoneTaken={setPhoneTaken} />
            <div className="flex gap-3">
              <button type="submit" disabled={saving || phoneTaken} className="btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button>
              <button type="button" onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </form>
      )}

      {/* Change password */}
      <form onSubmit={handlePasswordChange}>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h3 className="font-semibold">Change Password</h3>
          <div>
            <label className="label">Current Password</label>
            <input type="password" className="input" required value={pwForm.current_password} onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))} />
          </div>
          <div>
            <label className="label">New Password</label>
            <input type="password" className="input" required minLength={6} value={pwForm.new_password} onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))} />
          </div>
          <button type="submit" disabled={changingPw} className="btn-secondary">
            {changingPw ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </form>

      {cropSrc && (
        <PhotoCropModal imageSrc={cropSrc} onCancel={() => setCropSrc(null)} onCropped={handleCropped} />
      )}
    </div>
  );
}
