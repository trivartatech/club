import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getMember, updateMember, uploadPhoto } from '../../api/membersApi';
import MemberForm from '../../components/forms/MemberForm';
import { useToast } from '../../components/common/Toast';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/common/Avatar';
import PhotoCropModal from '../../components/common/PhotoCropModal';

export default function MemberEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { isAdminOrStaff } = useAuth();
  const [values, setValues] = useState(null);
  const [saving, setSaving] = useState(false);
  const [cropSrc, setCropSrc] = useState(null);
  const [phoneTaken, setPhoneTaken] = useState(false);
  const [originalPhone, setOriginalPhone] = useState('');
  const photoRef = useRef();

  useEffect(() => {
    getMember(id).then(r => { setValues(r.data.data); setOriginalPhone(r.data.data.phone || ''); }).catch(() => navigate(-1));
  }, [id]);

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
      const res = await uploadPhoto(id, fd);
      setValues(v => ({ ...v, photo_url: res.data.data.photo_url }));
      addToast('Photo updated');
    } catch {
      addToast('Photo upload failed', 'error');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateMember(id, values);
      addToast('Member updated successfully');
      navigate(`/members/${id}`);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update member', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (!values) return <div className="text-gray-400">Loading...</div>;

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        {/* Photo */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Photo</h3>
          <div className="flex items-center gap-4">
            <div className="relative cursor-pointer group" onClick={() => photoRef.current?.click()}>
              <Avatar src={values.photo_url} name={values.full_name} size="lg" />
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-xs">📷</span>
              </div>
            </div>
            <div>
              <button type="button" onClick={() => photoRef.current?.click()} className="btn-secondary text-sm">
                {values.photo_url ? 'Change Photo' : 'Upload Photo'}
              </button>
              <p className="text-xs text-gray-400 mt-1">JPEG, PNG or WebP, up to 5MB. Saved immediately.</p>
            </div>
            <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
          </div>
        </div>

        <MemberForm values={values} onChange={setValues} isEdit={true} isAdminOrStaff={isAdminOrStaff()} memberId={Number(id)} originalPhone={originalPhone} onPhoneTaken={setPhoneTaken} />
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving || phoneTaken} className="btn-primary">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
        </div>
      </div>

      {cropSrc && (
        <PhotoCropModal imageSrc={cropSrc} onCancel={() => setCropSrc(null)} onCropped={handleCropped} />
      )}
    </form>
  );
}
