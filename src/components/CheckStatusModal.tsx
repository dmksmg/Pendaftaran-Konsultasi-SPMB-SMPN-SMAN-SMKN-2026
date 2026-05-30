import React, { useState } from 'react';
import { X, Search } from 'lucide-react';

interface CheckStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  scriptUrl: string;
}

const CheckStatusModal: React.FC<CheckStatusModalProps> = ({ isOpen, onClose, scriptUrl }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      // Expecting Apps Script to handle ?action=data_masuk and return JSON array
      const url = `${scriptUrl}?action=data_masuk`;
      const res = await fetch(url);
      const json = await res.json();

      // json should be an array of objects or {data: [...]}
      const rows: any[] = Array.isArray(json) ? json : (json.data || []);

      // filter by name or phone (case-insensitive)
      const q = query.trim().toLowerCase();
      const filtered = rows.filter((r) => {
        const name = (r['Nama Siswa'] || r.namaSiswa || r.nama || '').toString().toLowerCase();
        const phone = (r['No.Whatsapp Siswa'] || r.whatsappSiswa || r.noWhatsapp || '').toString().toLowerCase();
        return q === '' || name.includes(q) || phone.includes(q);
      });

      setResults(filtered);
    } catch (err: any) {
      console.error('Error fetching data masuk:', err);
      setError('Gagal memuat data. Pastikan Apps Script sudah dideploy dan dapat diakses.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status: string) => {
    const s = (status || '').toString().toLowerCase();
    if (!s) return 'bg-gray-100 text-gray-700';
    if (s.includes('batal') || s.includes('cancel')) return 'bg-red-100 text-red-700';
    if (s.includes('menunggu') || s.includes('pending')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const formatTanggal = (raw: any) => {
    if (!raw) return '-';
    const str = String(raw).trim();

    const formatter = new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    });

    // ISO string
    const isoMatch = str.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?Z?$/);
    if (isoMatch) {
      const d = new Date(str);
      if (!isNaN(d.getTime())) return formatter.format(d);
    }

    // Format like dd/MM/yyyy or dd/MM/yyyy HH:mm
    const dm = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}:\d{2}))?/);
    if (dm) {
      const day = dm[1].padStart(2, '0');
      const month = dm[2].padStart(2, '0');
      const year = dm[3];
      const time = dm[4] ? dm[4] : '00:00';
      // create an ISO with +07:00 offset so Date parses as correct instant in WIB
      const isoWithTZ = `${year}-${month}-${day}T${time}:00+07:00`;
      const d = new Date(isoWithTZ);
      if (!isNaN(d.getTime())) return formatter.format(d);
    }

    // Fallback: return raw string
    return str;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-semibold mb-3">Cek Status Konsultasi</h3>

        <p className="text-sm text-gray-500 mb-4">Masukkan Nama Siswa atau No. WhatsApp Siswa untuk mencari status pendaftaran.</p>

        <div className="flex gap-2 mb-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 border rounded-lg px-3 py-2"
            placeholder="Nama siswa atau nomor WhatsApp..."
          />
          <button onClick={handleSearch} className="px-4 py-2 bg-primary-600 text-white rounded-lg flex items-center gap-2">
            <Search className="w-4 h-4" />
            Cari
          </button>
        </div>

        {loading && <p className="text-sm text-gray-500">Memuat...</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}

        {!loading && results.length === 0 && !error && (
          <p className="text-sm text-gray-500">Tidak ada hasil. Coba kosongi kueri untuk melihat semua entri.</p>
        )}

        {results.length > 0 && (
          <div className="mt-4 grid gap-3">
            {results.map((r, i) => {
              const nama = r['Nama Siswa'] || r.namaSiswa || r.nama || '';
              const tanggal = r['Tanggal Konsultasi'] || r.tanggalKonsultasi || '';
              const waktu = r['Waktu Konsultasi'] || r.waktuKonsultasi || '';
              const konsultan = r['Konsultan'] || r.konsultan || '';
              const tempat = r['Tempat Konsultasi'] || r.tempatKonsultasi || '';
              const status = r['Status'] || r.status || '';

              return (
                <div key={i} className="bg-white border rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm text-gray-700 font-semibold">Status</div>
                    <div>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusClass(status)}`}>{status || '-'}</span>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <div>
                      <p className="text-xs text-gray-500">Nama Siswa</p>
                      <p className="text-sm font-medium">{nama || '-'}</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Tanggal Konsultasi</p>
                        <p className="text-sm font-medium">{formatTanggal(tanggal)}</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Waktu Konsultasi</p>
                      <p className="text-sm font-medium">{waktu || '-'}</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Konsultan</p>
                      <p className="text-sm font-medium">{konsultan || '-'}</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Tempat Konsultasi</p>
                      <p className="text-sm font-medium">{tempat || '-'}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg">Tutup</button>
        </div>
      </div>
    </div>
  );
};

export default CheckStatusModal;
