import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMember } from '../../api/membersApi';

// Card artwork is 1011 x 639 (≈1.582:1). We render at a fixed width so the
// overlaid member details line up with the template, and it prints cleanly.
const CARD_W = 460;
const CARD_H = Math.round(CARD_W * 639 / 1011);

function PhotoBox({ src, name }) {
  const initials = name ? name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() : '';
  return (
    <div
      className="absolute rounded-lg overflow-hidden bg-gray-200 border-2 border-black shadow-md flex items-center justify-center"
      style={{ left: '4%', top: '34%', width: '27%', aspectRatio: '2.5 / 3.5' }}
    >
      {src
        ? <img src={src} alt={name || ''} className="w-full h-full object-cover" />
        : <span className="text-3xl font-bold text-gray-500">{initials || '👤'}</span>}
    </div>
  );
}

function InfoRow({ icon, children }) {
  return (
    <div className="flex items-center gap-2 text-black">
      <span className="text-xs w-4 text-center shrink-0">{icon}</span>
      <span className="text-[14px] font-semibold leading-snug">{children}</span>
    </div>
  );
}

// Auto-sizing address: fills the remaining panel space and shrinks its font
// (down to a minimum) just enough to show the full address without clipping.
function AddressText({ text }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      let fs = 13;
      el.style.fontSize = `${fs}px`;
      // Shrink until the full text fits within the allotted height.
      while (el.scrollHeight > el.offsetHeight && fs > 7) {
        fs -= 0.5;
        el.style.fontSize = `${fs}px`;
      }
    };
    fit();
    if (document.fonts?.ready) document.fonts.ready.then(fit);
  }, [text]);

  return (
    <div className="flex items-start gap-2 text-black flex-1 min-h-0">
      <span className="text-xs w-4 text-center shrink-0">📍</span>
      <span ref={ref} className="font-semibold leading-snug overflow-hidden block w-full h-full">{text}</span>
    </div>
  );
}

function CardFront({ member }) {
  const address = [member.house_no, member.street, member.city, member.pin_code].filter(Boolean).join(', ');
  return (
    <div
      id="id-card"
      className="relative rounded-xl overflow-hidden shadow-lg print:shadow-none bg-gray-100"
      style={{ width: CARD_W, height: CARD_H, backgroundImage: 'url(/idcard-front.png?v=2)', backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <PhotoBox src={member.photo_url} name={member.full_name} />

      {/* Info panel */}
      <div
        className="absolute px-2 py-1 flex flex-col justify-start gap-1"
        style={{
          left: '33%', right: '3%', top: '35%', bottom: '14%',
          fontFamily: "'Poppins', sans-serif",
          textShadow: '0 0 4px rgba(255,255,255,0.95), 0 0 4px rgba(255,255,255,0.95), 0 1px 2px rgba(255,255,255,0.9)',
        }}
      >
        <div className="text-black font-extrabold text-[17.5px] leading-tight uppercase line-clamp-2">{member.full_name}</div>
        <InfoRow icon="📞">{member.phone || '—'}</InfoRow>
        <InfoRow icon="💳">Member No. {member.member_number}</InfoRow>
        <AddressText text={address || member.city || '—'} />
      </div>
    </div>
  );
}

function CardBack() {
  return (
    <div
      id="id-card-back"
      className="rounded-xl overflow-hidden shadow-lg print:shadow-none"
      style={{ width: CARD_W, height: CARD_H }}
    >
      <img src="/idcard-back.png?v=4" alt="Card terms and conditions" className="w-full h-full object-cover" />
    </div>
  );
}

export default function MemberIdCard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getMember(id)
      .then(r => setMember(r.data.data))
      .catch(err => setError(err.response?.data?.message || 'Unable to load member'));
  }, [id]);

  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{error}</div>;
  if (!member) return <div className="text-gray-400">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="no-print flex justify-between items-center mb-4">
        <button onClick={() => navigate(-1)} className="btn-secondary text-xs">← Back</button>
        <button onClick={() => window.print()} className="btn-primary text-xs">🖨️ Print ID Card</button>
      </div>

      <div id="id-card-print" className="flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-1">
          <CardFront member={member} />
          <div className="no-print text-center text-[11px] text-gray-400">Front — Page 1</div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <CardBack />
          <div className="no-print text-center text-[11px] text-gray-400">Back — Page 2</div>
        </div>
      </div>

      <p className="no-print text-center text-xs text-gray-400 mt-4">
        Sized for an ID-card printer: each side prints to an exact 86 × 54 mm (CR80) page with no margins.
        In the print dialog, set Margins to “None” / paper size to the card, and enable “Background graphics”.
      </p>
    </div>
  );
}
