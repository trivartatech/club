import { useState, useEffect } from 'react';
import { getMemberNumberConfig, updateMemberNumberConfig } from '../../api/membersApi';
import { useToast } from '../../components/common/Toast';
import { buildMemberNumberPreview } from '../../utils/formatters';

function FormatFields({ form, onChange, idPrefix }) {
  const set = (k) => (e) => onChange({ ...form, [k]: e.target.value });
  const alpha = form.mode === 'alpha';
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <label className="label">Numbering style</label>
        <select className="input" value={form.mode || 'yearly'} onChange={set('mode')}>
          <option value="yearly">Year + running number (e.g. CCM-2026-0001)</option>
          <option value="alpha">By name initial (e.g. LM-CIC-S-61)</option>
        </select>
      </div>
      <div>
        <label className="label">Prefix</label>
        <input className="input" value={form.prefix} onChange={set('prefix')} placeholder="e.g. LM" maxLength={16} />
      </div>
      {alpha ? (
        <div>
          <label className="label">Code (middle)</label>
          <input className="input" value={form.code} onChange={set('code')} placeholder="e.g. CIC (optional)" maxLength={16} />
        </div>
      ) : (
        <div>
          <label className="label">Suffix</label>
          <input className="input" value={form.suffix} onChange={set('suffix')} placeholder="optional" maxLength={16} />
        </div>
      )}
      <div>
        <label className="label">Separator</label>
        <input className="input" value={form.separator} onChange={set('separator')} placeholder="e.g. -" maxLength={4} />
      </div>
      <div>
        <label className="label">Sequence Digits</label>
        <input type="number" min={1} max={12} className="input" value={form.padding} onChange={set('padding')} />
      </div>

      {!alpha && (
        <div className="col-span-2 flex items-center gap-2">
          <input
            id={`${idPrefix}_include_year`}
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300"
            checked={form.include_year}
            onChange={e => onChange({ ...form, include_year: e.target.checked })}
          />
          <label htmlFor={`${idPrefix}_include_year`} className="text-sm text-gray-700">Include current year</label>
        </div>
      )}

      {alpha ? (
        <p className="col-span-2 text-xs text-gray-500">
          Format: <span className="font-mono">{[form.prefix, form.code, '〈initial〉', '〈n〉'].filter(Boolean).join(form.separator || '-')}</span>.
          The number after the name initial counts up <strong>per letter</strong> automatically — e.g. the 61st “S” member becomes <span className="font-mono">…-S-61</span>.
        </p>
      ) : (
        <div className="col-span-2">
          <label className="label">Next Sequence Number</label>
          <input type="number" min={1} className="input" value={form.next_seq} onChange={set('next_seq')} />
        </div>
      )}
    </div>
  );
}

// Grid of the next number for every letter A–Z (alpha mode only).
function AlphaSequenceGrid({ form, sequences }) {
  const [showAll, setShowAll] = useState(false);
  if (!sequences) return null;
  const letters = Object.keys(sequences).sort();
  const active = letters.filter(L => sequences[L] > 1);
  const shown = showAll ? letters : active;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-700">Next number per letter</h4>
        <button type="button" onClick={() => setShowAll(s => !s)} className="text-xs text-primary-700 underline">
          {showAll ? 'Show only letters in use' : 'Show all A–Z'}
        </button>
      </div>
      {shown.length === 0 ? (
        <p className="text-xs text-gray-400">No members yet — every letter starts at {form.padding > 1 ? String(1).padStart(Number(form.padding), '0') : 1}.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {shown.map(L => (
            <div key={L} className={`flex items-center justify-between rounded px-2 py-1 text-xs font-mono ${sequences[L] > 1 ? 'bg-primary-50 text-primary-900' : 'bg-gray-50 text-gray-400'}`}>
              <span className="font-sans font-semibold">{L}</span>
              <span>{buildMemberNumberPreview(form, sequences[L], undefined, L)}</span>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-400 mt-2">Highlighted letters already have members; the value is the next number that letter will get. Save to refresh after editing.</p>
    </div>
  );
}

function Preview({ label, value, note }) {
  return (
    <div className="bg-primary-50 border border-primary-100 rounded-lg p-4 text-center">
      <div className="text-xs text-primary-700 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-2xl font-mono font-bold text-primary-900">{value || '—'}</div>
      {note && <div className="text-xs text-gray-500 mt-1">{note}</div>}
    </div>
  );
}

export default function MemberNumberConfig() {
  const { addToast } = useToast();
  const [general, setGeneral] = useState(null);
  const [lifetime, setLifetime] = useState(null);
  const [serverPreviews, setServerPreviews] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMemberNumberConfig().then(r => {
      const d = r.data.data;
      setGeneral({ prefix: d.prefix ?? 'CCM', code: d.code ?? '', separator: d.separator ?? '-', include_year: !!d.include_year, padding: d.padding ?? 4, suffix: d.suffix ?? '', next_seq: d.next_seq ?? 1, mode: d.mode || 'yearly' });
      setLifetime({ prefix: d.lt_prefix ?? 'CCL', code: d.lt_code ?? '', separator: d.lt_separator ?? '-', include_year: !!d.lt_include_year, padding: d.lt_padding ?? 4, suffix: d.lt_suffix ?? '', next_seq: d.lt_next_seq ?? 1, mode: d.lt_mode || 'yearly' });
      setServerPreviews({ general: d.preview, lifetime: d.lifetime_preview, genSeqs: d.alpha_sequences, ltSeqs: d.lt_alpha_sequences });
    }).catch(() => addToast('Failed to load configuration', 'error'));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateMemberNumberConfig({
        prefix: general.prefix, code: general.code, separator: general.separator, include_year: general.include_year,
        padding: Number(general.padding), suffix: general.suffix, next_seq: Number(general.next_seq), mode: general.mode,
        lt_prefix: lifetime.prefix, lt_code: lifetime.code, lt_separator: lifetime.separator, lt_include_year: lifetime.include_year,
        lt_padding: Number(lifetime.padding), lt_suffix: lifetime.suffix, lt_next_seq: Number(lifetime.next_seq), lt_mode: lifetime.mode,
      });
      const d = res.data.data;
      setServerPreviews({ general: d.preview, lifetime: d.lifetime_preview, genSeqs: d.alpha_sequences, ltSeqs: d.lt_alpha_sequences });
      addToast('Member number format updated');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (!general || !lifetime) return <div className="text-gray-400">Loading...</div>;

  // For name-initial mode, take the real "next sequence" from the server preview
  // (computed against existing data for the sample letter "A") so the live preview
  // shows the actual next digit, e.g. LM-CIC-A-0011 instead of a static -0001.
  const alphaNext = (sp) => { const m = String(sp || '').match(/(\d+)\s*$/); return m ? parseInt(m[1], 10) : 1; };
  const genSeq = general.mode === 'alpha' ? alphaNext(serverPreviews.general) : (Number(general.next_seq) || 1);
  const ltSeq = lifetime.mode === 'alpha' ? alphaNext(serverPreviews.lifetime) : (Number(lifetime.next_seq) || 1);
  const genLive = buildMemberNumberPreview(general, genSeq);
  const ltLive = buildMemberNumberPreview(lifetime, ltSeq);

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-4">
      {/* Standard members */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        <div>
          <h3 className="font-semibold">Standard Member Number</h3>
          <p className="text-sm text-gray-500 mt-1">Assigned when a member is added (New / General).</p>
        </div>
        <Preview
          label="Next number preview"
          value={genLive}
          note={general.mode === 'alpha' ? 'Shown for sample letter “A” — each letter has its own counter. Save to refresh.' : null}
        />
        <FormatFields form={general} onChange={setGeneral} idPrefix="gen" />
        {general.mode === 'alpha' && <AlphaSequenceGrid form={general} sequences={serverPreviews.genSeqs} />}
      </div>

      {/* Lifetime members */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        <div>
          <h3 className="font-semibold">Lifetime Member Number</h3>
          <p className="text-sm text-gray-500 mt-1">
            A new number issued automatically when a member is converted to Lifetime. Their previous number is kept on record.
          </p>
        </div>
        <Preview
          label="Next lifetime number preview"
          value={ltLive}
          note={lifetime.mode === 'alpha' ? 'Shown for sample letter “A” — each letter has its own counter. Save to refresh.' : null}
        />
        <FormatFields form={lifetime} onChange={setLifetime} idPrefix="lt" />
        {lifetime.mode === 'alpha' && <AlphaSequenceGrid form={lifetime} sequences={serverPreviews.ltSeqs} />}
      </div>

      <button type="submit" disabled={saving} className="btn-primary w-full">
        {saving ? 'Saving...' : 'Save Formats'}
      </button>
    </form>
  );
}
