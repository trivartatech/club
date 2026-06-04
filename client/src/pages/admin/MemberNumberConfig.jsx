import { useState, useEffect } from 'react';
import { getMemberNumberConfig, updateMemberNumberConfig } from '../../api/membersApi';
import { useToast } from '../../components/common/Toast';
import { buildMemberNumberPreview } from '../../utils/formatters';

function FormatFields({ form, onChange, idPrefix }) {
  const set = (k) => (e) => onChange({ ...form, [k]: e.target.value });
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="label">Prefix</label>
        <input className="input" value={form.prefix} onChange={set('prefix')} placeholder="e.g. CCM" maxLength={16} />
      </div>
      <div>
        <label className="label">Suffix</label>
        <input className="input" value={form.suffix} onChange={set('suffix')} placeholder="optional" maxLength={16} />
      </div>
      <div>
        <label className="label">Separator</label>
        <input className="input" value={form.separator} onChange={set('separator')} placeholder="e.g. -" maxLength={4} />
      </div>
      <div>
        <label className="label">Sequence Digits</label>
        <input type="number" min={1} max={12} className="input" value={form.padding} onChange={set('padding')} />
      </div>
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
      <div className="col-span-2">
        <label className="label">Next Sequence Number</label>
        <input type="number" min={1} className="input" value={form.next_seq} onChange={set('next_seq')} />
      </div>
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
      setGeneral({ prefix: d.prefix ?? 'CCM', separator: d.separator ?? '-', include_year: !!d.include_year, padding: d.padding ?? 4, suffix: d.suffix ?? '', next_seq: d.next_seq ?? 1 });
      setLifetime({ prefix: d.lt_prefix ?? 'CCL', separator: d.lt_separator ?? '-', include_year: !!d.lt_include_year, padding: d.lt_padding ?? 4, suffix: d.lt_suffix ?? '', next_seq: d.lt_next_seq ?? 1 });
      setServerPreviews({ general: d.preview, lifetime: d.lifetime_preview });
    }).catch(() => addToast('Failed to load configuration', 'error'));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateMemberNumberConfig({
        prefix: general.prefix, separator: general.separator, include_year: general.include_year,
        padding: Number(general.padding), suffix: general.suffix, next_seq: Number(general.next_seq),
        lt_prefix: lifetime.prefix, lt_separator: lifetime.separator, lt_include_year: lifetime.include_year,
        lt_padding: Number(lifetime.padding), lt_suffix: lifetime.suffix, lt_next_seq: Number(lifetime.next_seq),
      });
      const d = res.data.data;
      setServerPreviews({ general: d.preview, lifetime: d.lifetime_preview });
      addToast('Member number format updated');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (!general || !lifetime) return <div className="text-gray-400">Loading...</div>;

  const genLive = buildMemberNumberPreview(general, Number(general.next_seq) || 1);
  const ltLive = buildMemberNumberPreview(lifetime, Number(lifetime.next_seq) || 1);

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
          note={serverPreviews.general && serverPreviews.general !== genLive ? `Currently assigning: ${serverPreviews.general} (saved format)` : null}
        />
        <FormatFields form={general} onChange={setGeneral} idPrefix="gen" />
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
          note={serverPreviews.lifetime && serverPreviews.lifetime !== ltLive ? `Currently assigning: ${serverPreviews.lifetime} (saved format)` : null}
        />
        <FormatFields form={lifetime} onChange={setLifetime} idPrefix="lt" />
      </div>

      <button type="submit" disabled={saving} className="btn-primary w-full">
        {saving ? 'Saving...' : 'Save Formats'}
      </button>
    </form>
  );
}
