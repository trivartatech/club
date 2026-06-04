import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { bulkImportMembers } from '../../api/membersApi';
import { parseCsvRows, mapRowsToMembers } from '../../utils/parseCsv';
import { useToast } from '../../components/common/Toast';

const COLUMNS = [
  'full_name', 'membership_type', 'member_number', 'phone', 'phone_secondary', 'email',
  'gender', 'date_of_birth', 'house_no', 'street', 'city', 'pin_code',
  'join_date', 'general_since', 'lifetime_since', 'emergency_contact_name', 'emergency_contact_phone', 'notes',
];

const TEMPLATE =
  COLUMNS.join(',') + '\n' +
  'Ramesh Gowda,General,,9876500001,,ramesh@example.com,Male,1980-05-12,12,MG Road,Chitradurga,577501,2019-06-01,2019-06-01,,Sita Gowda,9876500002,Imported member\n' +
  'Lakshmi Devi,Lifetime,,9876500003,,,Female,1975-02-20,,Fort Road,Chitradurga,577501,2010-01-15,2011-01-15,2015-03-10,,,Lifetime member since 2015\n';

function downloadTemplate() {
  const blob = new Blob([TEMPLATE], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'member-import-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function MemberImport() {
  const { addToast } = useToast();
  const [matrix, setMatrix] = useState(null); // raw rows (header + data)
  const [forceType, setForceType] = useState('auto');
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef();

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    const reader = new FileReader();
    const isExcel = /\.(xlsx|xls)$/i.test(file.name);
    reader.onload = () => {
      try {
        let rows;
        if (isExcel) {
          const wb = XLSX.read(reader.result, { type: 'array', cellDates: true });
          const ws = wb.Sheets[wb.SheetNames[0]];
          rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' });
        } else {
          rows = parseCsvRows(String(reader.result));
        }
        if (!rows || rows.length < 2) { addToast('No data rows found in the file', 'error'); return; }
        setMatrix(rows);
        setFileName(file.name);
      } catch {
        addToast('Could not read that file. Use .xlsx or .csv.', 'error');
      }
    };
    if (isExcel) reader.readAsArrayBuffer(file); else reader.readAsText(file);
    e.target.value = '';
  }

  const rows = matrix ? mapRowsToMembers(matrix, forceType) : [];
  const invalid = rows.filter(r => !r.full_name || !r.full_name.trim());
  const byType = rows.reduce((acc, r) => {
    const t = (r.membership_type || 'General').trim() || 'General';
    acc[t] = (acc[t] || 0) + 1; return acc;
  }, {});

  async function handleImport() {
    if (rows.length === 0) return;
    setImporting(true);
    try {
      const res = await bulkImportMembers(rows);
      setResult(res.data.data);
      addToast(res.data.message, res.data.data.failed > 0 ? 'warning' : 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Import failed', 'error');
    } finally {
      setImporting(false);
    }
  }

  function reset() {
    setMatrix(null); setFileName(''); setResult(null); setForceType('auto');
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Instructions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-3">
        <h3 className="font-semibold">Bulk Import Members</h3>
        <p className="text-sm text-gray-600">
          Import pre-existing <strong>General</strong> and <strong>Lifetime</strong> members from an
          <strong> Excel (.xlsx)</strong> or <strong>CSV</strong> file. Columns are matched automatically
          (e.g. <span className="font-mono text-xs bg-gray-100 px-1 rounded">NAME</span>,
          <span className="font-mono text-xs bg-gray-100 px-1 rounded">CONTACT NO</span>,
          <span className="font-mono text-xs bg-gray-100 px-1 rounded">MEMBER ID</span>,
          <span className="font-mono text-xs bg-gray-100 px-1 rounded">DOJ</span>).
          Only a name is required. A bare year in the join column becomes Jan 1 of that year.
        </p>
        <div className="flex flex-wrap gap-3 items-center">
          <button onClick={downloadTemplate} className="btn-secondary text-sm">⬇ CSV template</button>
          <button onClick={() => fileRef.current?.click()} className="btn-primary text-sm">📄 Choose .xlsx / .csv file</button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,text/csv" className="hidden" onChange={handleFile} />
          {fileName && <span className="text-sm text-gray-500">{fileName}</span>}
        </div>
        <div className="flex items-center gap-2 pt-1">
          <label className="text-sm text-gray-600">Set membership type for all rows:</label>
          <select className="input !w-44" value={forceType} onChange={e => setForceType(e.target.value)}>
            <option value="auto">From file (or General)</option>
            <option value="General">All General</option>
            <option value="Lifetime">All Lifetime</option>
            <option value="New">All New</option>
          </select>
          <span className="text-xs text-gray-400">Use this when the file has no type column.</span>
        </div>
      </div>

      {/* Preview */}
      {matrix && !result && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap justify-between items-center gap-2">
            <div className="text-sm">
              <span className="font-semibold">{rows.length}</span> rows ·
              {' '}General <span className="font-medium">{byType.General || 0}</span> ·
              {' '}Lifetime <span className="font-medium">{byType.Lifetime || 0}</span>
              {byType.New ? <> · New <span className="font-medium">{byType.New}</span></> : null}
              {invalid.length > 0 && <span className="text-red-600 ml-2">{invalid.length} missing name (skipped)</span>}
            </div>
            <button onClick={handleImport} disabled={importing} className="btn-primary text-sm">
              {importing ? 'Importing…' : `Import ${rows.length - invalid.length} members`}
            </button>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2">#</th>
                  <th className="text-left px-3 py-2">Name</th>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-left px-3 py-2">Member No.</th>
                  <th className="text-left px-3 py-2">Phone</th>
                  <th className="text-left px-3 py-2">Since</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.slice(0, 100).map((r, i) => (
                  <tr key={i} className={!r.full_name?.trim() ? 'bg-red-50' : ''}>
                    <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                    <td className="px-3 py-1.5 font-medium">{r.full_name || <span className="text-red-600">— missing —</span>}</td>
                    <td className="px-3 py-1.5">{r.membership_type || 'General'}</td>
                    <td className="px-3 py-1.5 font-mono text-gray-500">{r.member_number || '(auto)'}</td>
                    <td className="px-3 py-1.5 text-gray-500">{r.phone || '—'}</td>
                    <td className="px-3 py-1.5 text-gray-500">{r.lifetime_since || r.general_since || r.join_date || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 100 && <div className="px-5 py-2 text-xs text-gray-400 border-t border-gray-100">Showing first 100 of {rows.length} rows.</div>}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="text-sm"><span className="text-gray-500">Total:</span> <span className="font-semibold">{result.total}</span></div>
            <div className="text-sm text-green-700"><span className="text-gray-500">Created:</span> <span className="font-semibold">{result.created}</span></div>
            <div className="text-sm text-red-700"><span className="text-gray-500">Failed:</span> <span className="font-semibold">{result.failed}</span></div>
          </div>
          {result.failed > 0 && (
            <div className="border border-red-100 rounded-lg overflow-hidden">
              <div className="bg-red-50 px-3 py-2 text-xs font-medium text-red-700">Errors</div>
              <div className="max-h-64 overflow-y-auto divide-y divide-gray-50 text-sm">
                {result.results.filter(r => r.status === 'error').map((r, i) => (
                  <div key={i} className="px-3 py-1.5 flex justify-between gap-3">
                    <span className="text-gray-700">Row {r.row}: {r.full_name || '(no name)'}</span>
                    <span className="text-red-600 text-xs text-right">{r.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <Link to="/members" className="btn-primary text-sm">View Members →</Link>
            <button onClick={reset} className="btn-secondary text-sm">Import another file</button>
          </div>
        </div>
      )}
    </div>
  );
}
