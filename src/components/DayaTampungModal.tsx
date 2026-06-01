import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const SHEET_ID = '14Fxfw0agf7Tr4C9s5jK_FSViS_ubIFbvILzgNbbP4_4';
const SHEET_NAME = encodeURIComponent('Daya Tampung SMA/SMK');
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}`;

// robust CSV parser that returns array of rows (each row is array of fields)
const parseCSV = (text: string): string[][] => {
  const rows: string[][] = [];
  let cur = '';
  let inQuotes = false;
  let row: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i+1];
    if (ch === '"') {
      if (inQuotes && next === '"') {
        cur += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      row.push(cur);
      cur = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      // end of row
      row.push(cur);
      rows.push(row.slice());
      row = [];
      cur = '';
      if (ch === '\r' && next === '\n') i++; // skip LF in CRLF
    } else {
      cur += ch;
    }
  }
  // push last field/row if present
  if (cur !== '' || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }
  return rows.map(r => r.map(f => (f || '').trim()));
};

const DayaTampungModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [kotas, setKotas] = useState<string[]>([]);
  const [jenjangs, setJenjangs] = useState<string[]>([]);
  
  const [selectedKota, setSelectedKota] = useState('');
  const [selectedJenjang, setSelectedJenjang] = useState('');
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Use CSV export to preserve multi-line fields in column E
        const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}`;
        const res = await fetch(CSV_URL);
        if (!res.ok) throw new Error('Network error');
        const csvText = await res.text();

        // Robust CSV parsing that preserves newlines inside quoted fields
        const rowsArr = parseCSV(csvText);
        if (!rowsArr || rowsArr.length === 0) throw new Error('Empty CSV');

        const headerRow = rowsArr[0].map(h => (h || '').toString().trim());
        const dataRows = rowsArr.slice(1);

        const KOTA_IDX = 0;
        const JENJANG_IDX = 1;
        const NO_IDX = 2;
        const SEKOLAH_IDX = 3;
        const DAYA_IDX = 4;

        const parsedRows: any[] = [];
        const kotaSet = new Set<string>();
        const jenjangSet = new Set<string>();

        dataRows.forEach((cols: string[], idx: number) => {
          const get = (i: number) => (typeof cols[i] !== 'undefined' ? String(cols[i]) : '').trim();
          const kota = get(KOTA_IDX);
          const jenjang = get(JENJANG_IDX);
          const no = get(NO_IDX) || (idx + 1).toString();
          const sekolah = get(SEKOLAH_IDX);
          let daya = get(DAYA_IDX);

          if (daya) {
            // replace literal \n sequences with actual newlines (if present)
            daya = daya.replace(/\\n/g, '\n');
            // replace <br> tags
            daya = daya.replace(/<br\s*\/?>(?=.)/gi, '\n');
            // split on semicolons
            daya = daya.replace(/;\s*/g, '\n');
            daya = daya.replace(/\r/g, '');
            daya = daya.split('\n').map(l => l.trim()).filter(Boolean).join('\n');
          }

          if (kota) kotaSet.add(kota);
          if (jenjang) jenjangSet.add(jenjang);

          parsedRows.push({
            id: idx,
            no,
            kota,
            jenjang,
            sekolah,
            daya: daya || '-'
          });
        });
        
        setRows(parsedRows);
        setKotas(Array.from(kotaSet).sort());
        setJenjangs(Array.from(jenjangSet).sort());
        
      } catch (err: any) {
        console.error('Failed to fetch:', err);
        setError('Gagal memuat data. ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = rows.filter(r => {
    if (selectedKota && r.kota !== selectedKota) return false;
    if (selectedJenjang && r.jenjang !== selectedJenjang) return false;
    return true;
  });

  const formatDayaTampung = (daya: string) => {
    if (!daya || daya === '-') {
      return <span className="text-gray-400 italic text-sm">-</span>;
    }
    
    // Pisahkan berdasarkan newline
    const lines = daya.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      return <span className="text-gray-400 italic text-sm">-</span>;
    }
    
    // Jika hanya 1 baris dan mengandung koma, pisahkan
    if (lines.length === 1 && lines[0].includes(',')) {
      const items = lines[0].split(',').map(item => item.trim());
      if (items.length > 1) {
        return (
          <ul className="list-disc pl-4 space-y-1">
            {items.map((item, i) => (
              <li key={i} className="text-sm whitespace-pre-wrap break-words">{item}</li>
            ))}
          </ul>
        );
      }
    }
    
    // Multi-baris format - tampilkan sebagai list
    return (
      <ul className="list-disc pl-4 space-y-1">
        {lines.map((line, i) => (
          <li key={i} className="text-sm whitespace-pre-wrap break-words">{line}</li>
        ))}
      </ul>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col p-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-semibold mb-2">Daya Tampung Sekolah</h3>
        <p className="text-sm text-gray-500 mb-4">Pilih KOTA/KABUPATEN dan JENJANG STUDI untuk melihat daya tampung.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs text-gray-600 font-medium">KOTA / KABUPATEN</label>
            <select 
              className="w-full border rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              value={selectedKota} 
              onChange={e => { setSelectedKota(e.target.value); setShowResults(false); }}
            >
              <option value="">-- Pilih Kota / Kabupaten --</option>
              {kotas.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-600 font-medium">JENJANG STUDI</label>
            <select 
              className="w-full border rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              value={selectedJenjang} 
              onChange={e => { setSelectedJenjang(e.target.value); setShowResults(false); }}
            >
              <option value="">-- Pilih Jenjang --</option>
              {jenjangs.map((j) => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setShowResults(true)}
            disabled={!selectedKota || !selectedJenjang}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          >
            Tampilkan Data
          </button>
          <p className="text-xs text-gray-500">Pilih kedua filter lalu klik <strong>Tampilkan Data</strong></p>
        </div>

        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {showResults && !loading && !error && (
          <div className="flex-1 overflow-auto mt-3">
            <div className="mb-3 text-sm text-gray-600">
              Menampilkan <strong>{filtered.length}</strong> data untuk {selectedJenjang} di {selectedKota}
            </div>
            
            {filtered.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Tidak ada data untuk {selectedJenjang} di {selectedKota}</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-left text-sm font-medium text-gray-700 border-b">
                      <th className="py-3 px-4 w-16">NO</th>
                      <th className="py-3 px-4 w-1/3">SEKOLAH</th>
                      <th className="py-3 px-4">DAYA TAMPUNG</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filtered.map((r, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 align-top">
                        <td className="py-3 px-4 text-sm text-gray-700">{r.no}</td>
                        <td className="py-3 px-4 text-sm text-gray-800 font-medium">{r.sekolah}</td>
                        <td className="py-3 px-4">
                          {formatDayaTampung(r.daya)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex justify-end pt-4 border-t">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default DayaTampungModal;