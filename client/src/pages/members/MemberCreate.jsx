import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createMember, uploadPhoto, getNextMemberNumber } from '../../api/membersApi';
import MemberForm from '../../components/forms/MemberForm';
import { useToast } from '../../components/common/Toast';
import Avatar from '../../components/common/Avatar';
import PhotoCropModal from '../../components/common/PhotoCropModal';

const defaults = {
  member_number: '', full_name: '', gender: '', date_of_birth: '', phone: '', phone_secondary: '', email: '',
  house_no: '', street: '', city: 'Chitradurga', pin_code: '577501',
  emergency_contact_name: '', emergency_contact_phone: '', notes: '',
  join_date: new Date().toISOString().split('T')[0],
};

export default function MemberCreate() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [values, setValues] = useState(defaults);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [cropSrc, setCropSrc] = useState(null);
  const [phoneTaken, setPhoneTaken] = useState(false);
  const [suggestedNumber, setSuggestedNumber] = useState('');
  const photoRef = useRef();

  // Pre-fill the suggested next member number (editable). For name-initial
  // numbering the suggestion depends on the typed name, so re-fetch (debounced)
  // as the name changes — but only overwrite the field while it still matches
  // the last suggestion (i.e. the admin hasn't typed a custom number).
  useEffect(() => {
    const t = setTimeout(() => {
      getNextMemberNumber(values.full_name)
        .then(r => {
          const sug = r.data.data.member_number;
          setValues(v => (!v.member_number || v.member_number === suggestedNumber ? { ...v, member_number: sug } : v));
          setSuggestedNumber(sug);
        })
        .catch(() => {});
    }, 350);
    return () => clearTimeout(t);
  }, [values.full_name]); // eslint-disable-line react-hooks/exhaustive-deps

  function handlePhotoSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropSrc(URL.createObjectURL(file));
    e.target.value = ''; // allow re-selecting the same file later
  }

  function handleCropped(file, previewUrl) {
    setPhotoFile(file);
    setPhotoPreview(previewUrl);
    setCropSrc(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      // If the number is unchanged from the suggestion, send blank so the server
      // generates it and advances the sequence counter. Only send an explicit
      // value when the admin typed a custom number.
      const entered = (values.member_number || '').trim();
      const payload = { ...values, member_number: entered === suggestedNumber ? '' : entered };
      const res = await createMember(payload);
      const newId = res.data.data.id;

      // The photo can only be attached once the member record exists.
      if (photoFile) {
        try {
          const fd = new FormData();
          fd.append('photo', photoFile);
          await uploadPhoto(newId, fd);
        } catch {
          addToast('Member created, but photo upload failed. You can add it from the profile.', 'error');
        }
      }

      addToast(`Member ${res.data.data.member_number} created successfully`);
      navigate(`/members/${newId}`);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create member', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        {/* Photo */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Photo</h3>
          <div className="flex items-center gap-4">
            <div
              className="relative cursor-pointer group"
              onClick={() => photoRef.current?.click()}
            >
              <Avatar src={photoPreview} name={values.full_name} size="lg" />
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-xs">📷</span>
              </div>
            </div>
            <div>
              <button type="button" onClick={() => photoRef.current?.click()} className="btn-secondary text-sm">
                {photoPreview ? 'Change Photo' : 'Choose Photo'}
              </button>
              {photoPreview && (
                <button
                  type="button"
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null); if (photoRef.current) photoRef.current.value = ''; }}
                  className="btn-secondary text-sm ml-2 text-red-700 border-red-300"
                >
                  Remove
                </button>
              )}
              <p className="text-xs text-gray-400 mt-1">JPEG, PNG or WebP, up to 5MB.</p>
            </div>
            <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoSelect} />
          </div>
        </div>

        <MemberForm values={values} onChange={setValues} isAdminOrStaff={true} onPhoneTaken={setPhoneTaken} />
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving || phoneTaken} className="btn-primary">
            {saving ? 'Saving...' : 'Create Member'}
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
