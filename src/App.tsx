import { useState, useEffect } from 'react';
import {
  GraduationCap,
  User,
  School,
  Phone,
  Users,
  MapPin,
  Route,
  Target,
  Building2,
  MessageCircle,
  ChevronRight,
  ChevronLeft,
  Send,
  Star,
  BookOpen,
  Shield,
  Clock,
  Sparkles,
  X,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import FormField from './components/FormField';
import StepIndicator from './components/StepIndicator';
import SuccessModal from './components/SuccessModal';
import CheckStatusModal from './components/CheckStatusModal';
import DayaTampungModal from './components/DayaTampungModal';

// URL Google Apps Script yang sudah dideploy
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwmt21box6T9w0OeO8FifXzs9H-yt3qtoEBAt1HCrh5gL7KYE6RO6QbHI3owzW9wgY6/exec';

interface FormData {
  namaSiswa: string;
  asalSekolah: string;
  whatsappSiswa: string;
  namaOrangTua: string;
  whatsappOrangTua: string;
  alamatRumah: string;
  jenjangPendidikan: string; // New field
  jalurMasuk: string;
  sekolahTarget: string[];
  tempatKonsultasi: string;
}

interface FormErrors {
  [key: string]: string;
}

const jenjangPendidikanOptions = [
  { value: 'SMP', label: 'SMP' },
  { value: 'SMA', label: 'SMA' },
  { value: 'SMK', label: 'SMK' },
];

const jalurMasukOptions = [
  { value: 'Zonasi', label: 'Zonasi(Domisili)' },
  { value: 'Prestasi Akademik', label: 'Prestasi Akademik' },
  { value: 'Afirmasi', label: 'Afirmasi' },
  { value: 'Perpindahan Orang Tua', label: 'Perpindahan Orang Tua(Mutasi)' },
  { value: 'Belum Tahu', label: 'Belum Tahu / Perlu Konsultasi' },
];

// Fallback options jika fetch gagal
const fallbackSekolahSMP = [
  { value: 'SMPN 1', label: 'SMPN 1 JAKARTA' },
];

const fallbackSekolahSMA = [
  { value: 'SMAN 1', label: 'SMAN 1 JAKARTA' },
  { value: 'SMAN 2', label: 'SMAN 2 JAKARTA' },
];

const fallbackSekolahSMK = [
  { value: 'SMKN 1', label: 'SMKN 1 JAKARTA' },
];

const fallbackTempatKonsultasiOptions = [
  { value: 'Online (Zoom/Google Meet)', label: 'Online (Zoom / Google Meet)' },
  { value: 'Offline (Datang Langsung)', label: 'Offline (Datang Langsung)' },
  { value: 'Via WhatsApp', label: 'Via WhatsApp Chat/Call' },
];

// URL untuk fetch data dari Google Sheets (CSV export) - sheet "Validasi"
// Menargetkan sheet bernama "Validasi" agar tidak mengambil sheet default
const SHEETS_URL = 'https://docs.google.com/spreadsheets/d/1ASHtHbSeGP0NLuaFPKf_cN6ccsddyOCkvwsGy4Ns3pA/gviz/tq?tqx=out:csv&sheet=Validasi';

function App() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [sekolahSMP, setSekolahSMP] = useState(fallbackSekolahSMP);
  const [sekolahSMA, setSekolahSMA] = useState(fallbackSekolahSMA);
  const [sekolahSMK, setSekolahSMK] = useState(fallbackSekolahSMK);
  const [tempatKonsultasiOptions, setTempatKonsultasiOptions] = useState(fallbackTempatKonsultasiOptions);
  const [fetchAttempt, setFetchAttempt] = useState(0);
  const [usedFallback, setUsedFallback] = useState(false);
  const [showCheckStatus, setShowCheckStatus] = useState(false);
  const [showDayaTampung, setShowDayaTampung] = useState(false);
  const MAX_FETCH_RETRIES = 2;
  const [formData, setFormData] = useState<FormData>({
    namaSiswa: '',
    asalSekolah: '',
    whatsappSiswa: '',
    namaOrangTua: '',
    whatsappOrangTua: '',
    alamatRumah: '',
    jenjangPendidikan: '',
    jalurMasuk: '',
    sekolahTarget: [],
    tempatKonsultasi: '',
  });

  const totalSteps = 3;
  const stepLabels = ['Data Siswa', 'Data Orang Tua', 'Konsultasi'];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    // Normalize WhatsApp numbers to local format without leading 0 or country code
    const normalizePhone = (raw: string) => {
      if (!raw) return '';
      const digits = raw.toString().replace(/\D/g, '');
      if (digits.startsWith('62')) return digits.slice(2);
      if (digits.startsWith('0')) return digits.slice(1);
      return digits;
    };

    const newValue = (name === 'whatsappSiswa' || name === 'whatsappOrangTua') ? normalizePhone(String(value)) : value;

    setFormData((prev) => ({ ...prev, [name]: newValue }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: FormErrors = {};

    if (step === 1) {
      if (!formData.namaSiswa.trim()) newErrors.namaSiswa = 'Nama siswa wajib diisi';
      if (!formData.asalSekolah.trim()) newErrors.asalSekolah = 'Asal sekolah wajib diisi';
      if (!formData.whatsappSiswa.trim()) {
        newErrors.whatsappSiswa = 'Nomor WhatsApp siswa wajib diisi';
      } else if (!/^[0-9]{9,13}$/.test(formData.whatsappSiswa)) {
        newErrors.whatsappSiswa = 'Format nomor WhatsApp tidak valid';
      }
    } else if (step === 2) {
      if (!formData.namaOrangTua.trim()) newErrors.namaOrangTua = 'Nama orang tua wajib diisi';
      if (!formData.whatsappOrangTua.trim()) {
        newErrors.whatsappOrangTua = 'Nomor WhatsApp orang tua wajib diisi';
      } else if (!/^[0-9]{9,13}$/.test(formData.whatsappOrangTua)) {
        newErrors.whatsappOrangTua = 'Format nomor WhatsApp tidak valid';
      }
      if (!formData.alamatRumah.trim()) newErrors.alamatRumah = 'Alamat rumah wajib diisi';
    } else if (step === 3) {
      if (!formData.jenjangPendidikan) newErrors.jenjangPendidikan = 'Pilih jenjang pendidikan';
      if (!formData.jalurMasuk) newErrors.jalurMasuk = 'Pilih jalur masuk';
      if (!formData.sekolahTarget || formData.sekolahTarget.length === 0) {
        newErrors.sekolahTarget = 'Pilih minimal satu sekolah target';
      }
      if (!formData.tempatKonsultasi) newErrors.tempatKonsultasi = 'Pilih tempat konsultasi';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);
    
    try {
      // Menyiapkan data untuk dikirim
      const payload = {
        timestamp: new Date().toLocaleString('id-ID'),
        namaSiswa: formData.namaSiswa,
        asalSekolah: formData.asalSekolah,
        whatsappSiswa: formData.whatsappSiswa,
        namaOrangTua: formData.namaOrangTua,
        whatsappOrangTua: formData.whatsappOrangTua,
        alamatRumah: formData.alamatRumah,
        jenjangPendidikan: formData.jenjangPendidikan,
        jalurMasuk: formData.jalurMasuk,
        sekolahTarget: formData.sekolahTarget.join(', '),
        tempatKonsultasi: formData.tempatKonsultasi,
      };

      // Mengirim ke Google Apps Script
      // Mengirim data ke Google Apps Script
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', 
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // Karena menggunakan mode 'no-cors', browser tidak mengizinkan pembacaan response
      // Kita asumsikan sukses jika tidak masuk ke blok catch
      toast.success('Pendaftaran Anda telah berhasil dikirim!');
      setIsSubmitting(false);
      setIsFormOpen(false);
      setShowSuccess(true);
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Terjadi kesalahan saat mengirim data. Silakan coba lagi.');
      setIsSubmitting(false);
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
    setIsFormOpen(false); // Close the main form modal too
    setFormData({
      namaSiswa: '',
      asalSekolah: '',
      whatsappSiswa: '',
      namaOrangTua: '',
      whatsappOrangTua: '',
      alamatRumah: '',
      jenjangPendidikan: '',
      jalurMasuk: '',
      sekolahTarget: [],
      tempatKonsultasi: '',
    });
    setCurrentStep(1);
  };

  // Count filled fields for progress
  const filledCount = Object.values(formData).filter((v) => {
    if (Array.isArray(v)) return v.length > 0;
    return typeof v === 'string' && v.trim() !== '';
  }).length;
  const totalFields = Object.keys(formData).length;
  const progressPercent = Math.round((filledCount / totalFields) * 100);

  // Animated counter
  const [animatedCount, setAnimatedCount] = useState(158);

  // Fetch data dari Google Sheets dengan retry dan notifikasi jika fallback dipakai
  useEffect(() => {
    const parseCSVLine = (line: string) => {
      const result: string[] = [];
      let current = '';
      let insideQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
          if (insideQuotes && nextChar === '"') {
            current += '"';
            i++;
          } else {
            insideQuotes = !insideQuotes;
          }
        } else if (char === ',' && !insideQuotes) {
          result.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }

      result.push(current.trim().replace(/^"|"$/g, ''));
      return result;
    };

    const fetchSheetData = async (attempt = 0) => {
      try {
        console.log('Fetching sheet CSV from URL:', SHEETS_URL);
        const response = await fetch(SHEETS_URL);
        if (!response.ok) throw new Error('Network response not ok');
        const csvText = await response.text();

        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length === 0) return;

        const headers = parseCSVLine(lines[0]);
        const smpnIndex = headers.findIndex(h => h.toLowerCase().includes('smpn'));
        const smanIndex = headers.findIndex(h => h.toLowerCase().includes('sman'));
        const smknIndex = headers.findIndex(h => h.toLowerCase().includes('smkn'));
        const tempatIndex = headers.findIndex(h => h.toLowerCase().includes('tempat'));

        const smpList: typeof sekolahSMP = [];
        const smaList: typeof sekolahSMA = [];
        const smkList: typeof sekolahSMK = [];
        const tempatList: typeof tempatKonsultasiOptions = [];

        for (let i = 1; i < lines.length; i++) {
          const cells = parseCSVLine(lines[i]);

          if (smpnIndex >= 0 && cells[smpnIndex]) {
            const value = cells[smpnIndex].trim();
            if (value && !smpList.some(s => s.value === value)) smpList.push({ value, label: value });
          }
          if (smanIndex >= 0 && cells[smanIndex]) {
            const value = cells[smanIndex].trim();
            if (value && !smaList.some(s => s.value === value)) smaList.push({ value, label: value });
          }
          if (smknIndex >= 0 && cells[smknIndex]) {
            const value = cells[smknIndex].trim();
            if (value && !smkList.some(s => s.value === value)) smkList.push({ value, label: value });
          }
          if (tempatIndex >= 0 && cells[tempatIndex]) {
            const value = cells[tempatIndex].trim();
            if (value && !tempatList.some(t => t.value === value)) tempatList.push({ value, label: value });
          }
        }

        if (smpList.length > 0) setSekolahSMP(smpList);
        if (smaList.length > 0) setSekolahSMA(smaList);
        if (smkList.length > 0) setSekolahSMK(smkList);
        if (tempatList.length > 0) setTempatKonsultasiOptions(tempatList);

        // Reset fallback flag
        setUsedFallback(false);
      } catch (error) {
        console.warn('Attempt', attempt, 'failed to fetch sheet data:', error);
        if (attempt < MAX_FETCH_RETRIES) {
          const next = attempt + 1;
          setTimeout(() => fetchSheetData(next), 1000 * next);
          setFetchAttempt(attempt + 1);
        } else {
          // after retries, keep fallback and notify
          setUsedFallback(true);
          toast.warn('Gagal memuat data validasi dari spreadsheet — menggunakan opsi default. Pastikan sheet "validasi" dipublish atau gunakan Apps Script dengan CORS.');
        }
      }
    };

    fetchSheetData(0);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedCount((prev) => prev + Math.floor(Math.random() * 2));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Get sekolah target options based on jenjang pendidikan
  const getSekolahTargetOptions = () => {
    switch (formData.jenjangPendidikan) {
      case 'SMP':
        return sekolahSMP;
      case 'SMA':
        return sekolahSMA;
      case 'SMK':
        return sekolahSMK;
      default:
        return [];
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Toaster position="top-center" reverseOrder={false} />
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <img
            src="/images/hero-bg.jpg"
            alt="School"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary-900/90 via-primary-800/85 to-indigo-900/90" />
          {/* Animated particles */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute w-72 h-72 bg-accent-400/10 rounded-full -top-20 -left-20 blur-3xl animate-float" />
            <div className="absolute w-96 h-96 bg-primary-400/10 rounded-full -bottom-32 -right-32 blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
            <div className="absolute w-48 h-48 bg-white/5 rounded-full top-1/2 left-1/3 blur-2xl animate-float" style={{ animationDelay: '0.8s' }} />
          </div>
        </div>

        <div className="relative z-10 px-4 py-12 md:py-20">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md border border-white/20 rounded-full px-5 py-2 mb-6 animate-fade-in-up">
              <Sparkles className="w-4 h-4 text-accent-400" />
              <span className="text-white/90 text-sm font-medium">Pendaftaran Dibuka!</span>
              <span className="bg-accent-400 text-primary-900 text-xs font-bold px-2 py-0.5 rounded-full">2026</span>
            </div>

            {/* Logo / Icon */}
            <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-accent-400 to-accent-500 rounded-2xl shadow-2xl mb-6 rotate-3 hover:rotate-0 transition-transform duration-500">
                <GraduationCap className="w-10 h-10 text-primary-900" />
              </div>
            </div>

            <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white mb-4 animate-fade-in-up leading-tight" style={{ animationDelay: '0.2s' }}>
              Konsultasi SPMB
              <br />
              <span className="bg-gradient-to-r from-accent-400 to-yellow-300 bg-clip-text text-transparent">
                SMPN / SMAN / SMKN 2026
              </span>
            </h1>

            <p className="text-lg md:text-xl text-blue-100/80 max-w-2xl mx-auto mb-10 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              Dapatkan bimbingan eksklusif untuk meraih sekolah impianmu.
              <br className="hidden md:block" />
              Daftar sekarang dan konsultasikan strategimu bersama tim ahli kami!
            </p>

            <div className="flex justify-center mb-12 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <button
                onClick={() => setIsFormOpen(true)}
                className="group relative inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-accent-400 to-yellow-300 text-primary-900 font-extrabold text-xl rounded-2xl shadow-[0_10px_40px_-10px_rgba(234,179,8,0.5)] hover:shadow-[0_15px_50px_-10px_rgba(234,179,8,0.7)] hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 shimmer-btn opacity-30" />
                <Send className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                Daftar Konsultasi Sekarang
              </button>
            </div>

            <div className="flex justify-center mb-6">
              <button
                onClick={() => setShowCheckStatus(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-2xl border border-white/20 hover:bg-white/20 transition"
              >
                Cek Status Konsultasi
              </button>
            </div>

              <div className="flex justify-center mb-6">
                <button
                  onClick={() => setShowDayaTampung(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-2xl border border-white/20 hover:bg-white/20 transition"
                >
                  Daya Tampung
                </button>
              </div>

            
          </div>
        </div>

        {/* Wave separator */}
        <div className="relative z-10">
          <svg viewBox="0 0 1440 120" className="w-full h-auto -mb-1" preserveAspectRatio="none">
            <path
              d="M0,64L48,58.7C96,53,192,43,288,48C384,53,480,75,576,80C672,85,768,75,864,64C960,53,1056,43,1152,42.7C1248,43,1344,53,1392,58.7L1440,64L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"
              fill="currentColor"
              className="text-slate-50"
            />
          </svg>
        </div>
      </header>

      {/* Features Section */}
      <section className="relative z-10 -mt-6 mb-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[
              { icon: <Shield className="w-6 h-6" />, title: 'Terpercaya', desc: 'Berpengalaman bertahun-tahun' },
              { icon: <BookOpen className="w-6 h-6" />, title: 'Materi Lengkap', desc: 'Panduan SPMB terkini' },
              { icon: <Clock className="w-6 h-6" />, title: 'Fleksibel', desc: 'Online & Offline' },
              { icon: <Star className="w-6 h-6" />, title: 'Gratis', desc: 'Konsultasi gratis' },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-4 shadow-lg shadow-blue-100/50 border border-blue-100/50 text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 text-primary-600 rounded-xl mb-2">
                  {feature.icon}
                </div>
                <h3 className="font-bold text-gray-800 text-sm">{feature.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-primary-950/40 backdrop-blur-md transition-opacity duration-300"
            onClick={() => !isSubmitting && setIsFormOpen(false)}
          />
          
          {/* Modal Container */}
          <div className="relative w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl animate-fade-in-up custom-scrollbar mx-2">
            {/* Close Button */}
            {!isSubmitting && (
              <button
                onClick={() => setIsFormOpen(false)}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all z-20"
              >
                <X className="w-5 h-5 sm:w-6 sm:right-6" />
              </button>
            )}

            {/* Form Header */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-5 sm:px-8 py-6 sm:py-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-white text-xl sm:text-2xl font-bold flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg">
                      <Send className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    Form Pendaftaran
                  </h2>
                  <p className="text-blue-100/80 text-xs sm:text-sm mt-1 sm:mt-2">Lengkapi data konsultasi SPMB 2026</p>
                </div>
                <div className="text-right hidden sm:block">
                  <div className="bg-white/20 backdrop-blur rounded-full px-4 py-1.5 text-sm text-white font-bold">
                    {progressPercent}% Lengkap
                  </div>
                  <div className="w-32 h-2 bg-white/20 rounded-full mt-3 overflow-hidden">
                    <div
                      className="h-full bg-accent-400 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Step Indicator */}
            <div className="px-5 sm:px-8 pt-6 sm:pt-8">
              <StepIndicator currentStep={currentStep} totalSteps={totalSteps} stepLabels={stepLabels} />
            </div>

            {/* Form Body */}
            <div className="px-5 sm:px-8 pb-8 sm:pb-10">
              {/* Step 1: Data Siswa */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-fade-in-up">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                      <User className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">Data Siswa</h3>
                      <p className="text-xs text-gray-500">Informasi dasar calon peserta</p>
                    </div>
                  </div>

                  <FormField
                    label="Nama Lengkap Siswa"
                    name="namaSiswa"
                    placeholder="Masukkan nama lengkap siswa"
                    value={formData.namaSiswa}
                    onChange={handleChange}
                    icon={<User className="w-5 h-5" />}
                    error={errors.namaSiswa}
                  />

                  <FormField
                    label="Asal Sekolah (SMP/MTs)"
                    name="asalSekolah"
                    placeholder="Contoh: SMPN 1 Jakarta"
                    value={formData.asalSekolah}
                    onChange={handleChange}
                    icon={<School className="w-5 h-5" />}
                    error={errors.asalSekolah}
                  />

                  <FormField
                    label="Nomor WhatsApp Siswa"
                    name="whatsappSiswa"
                    placeholder="Contoh: 8123456789"
                    value={formData.whatsappSiswa}
                    onChange={handleChange}
                    icon={<Phone className="w-5 h-5" />}
                    error={errors.whatsappSiswa}
                  />
                </div>
              )}

              {/* Step 2: Data Orang Tua */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-fade-in-up">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">Data Orang Tua & Alamat</h3>
                      <p className="text-xs text-gray-500">Informasi wali dan tempat tinggal</p>
                    </div>
                  </div>

                  <FormField
                    label="Nama Orang Tua / Wali"
                    name="namaOrangTua"
                    placeholder="Masukkan nama orang tua/wali"
                    value={formData.namaOrangTua}
                    onChange={handleChange}
                    icon={<Users className="w-5 h-5" />}
                    error={errors.namaOrangTua}
                  />

                  <FormField
                    label="Nomor WhatsApp Orang Tua"
                    name="whatsappOrangTua"
                    placeholder="Contoh: 8129876543"
                    value={formData.whatsappOrangTua}
                    onChange={handleChange}
                    icon={<Phone className="w-5 h-5" />}
                    error={errors.whatsappOrangTua}
                  />

                  <FormField
                    label="Alamat Rumah"
                    name="alamatRumah"
                    type="textarea"
                    placeholder="Masukkan alamat lengkap rumah (RT/RW, Kelurahan, Kecamatan, Kota)"
                    value={formData.alamatRumah}
                    onChange={handleChange}
                    icon={<MapPin className="w-5 h-5" />}
                    error={errors.alamatRumah}
                  />
                </div>
              )}

              {/* Step 3: Info Konsultasi */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-fade-in-up">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                      <Target className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">Informasi Konsultasi</h3>
                      <p className="text-xs text-gray-500">Target sekolah dan preferensi konsultasi</p>
                    </div>
                  </div>

                  <FormField
                    label="Jenjang Pendidikan yang Dituju"
                    name="jenjangPendidikan"
                    type="searchableSelect"
                    placeholder="Pilih jenjang..."
                    value={formData.jenjangPendidikan}
                    onChange={handleChange}
                    options={jenjangPendidikanOptions}
                    icon={<GraduationCap className="w-5 h-5" />}
                    error={errors.jenjangPendidikan}
                  />

                  <FormField
                    label="Jalur Masuk yang Diminati"
                    name="jalurMasuk"
                    type="searchableSelect"
                    placeholder="Cari dan pilih jalur masuk..."
                    value={formData.jalurMasuk}
                    onChange={handleChange}
                    options={jalurMasukOptions}
                    icon={<Route className="w-5 h-5" />}
                    error={errors.jalurMasuk}
                  />

                  <FormField
                    label="Sekolah Target"
                    name="sekolahTarget"
                    type="multiSearchableSelect"
                    placeholder="Cari dan pilih sekolah target..."
                    value={formData.sekolahTarget}
                    onChange={handleChange}
                    options={getSekolahTargetOptions()}
                    icon={<Target className="w-5 h-5" />}
                    error={errors.sekolahTarget}
                  />

                  <FormField
                    label="Tempat Konsultasi"
                    name="tempatKonsultasi"
                    type="searchableSelect"
                    placeholder="Cari dan pilih tempat konsultasi..."
                    value={formData.tempatKonsultasi}
                    onChange={handleChange}
                    options={tempatKonsultasiOptions}
                    icon={<Building2 className="w-5 h-5" />}
                    error={errors.tempatKonsultasi}
                  />
                  
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 flex items-start gap-4 animate-fade-in-up shadow-sm">
                    <div className="bg-blue-100 p-2.5 rounded-xl shrink-0">
                      <MessageCircle className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-blue-900">Penting</p>
                      <p className="text-xs text-blue-700/80 mt-1 leading-relaxed">
                        Pastikan data yang Anda isi sudah benar. Link grup WhatsApp resmi akan diberikan segera setelah pendaftaran Anda berhasil dikirim.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 sm:gap-0 mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-gray-100">
                {currentStep > 1 ? (
                  <button
                    onClick={handlePrev}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 text-gray-600 font-bold rounded-2xl hover:bg-gray-100 transition-all duration-300 group disabled:opacity-50"
                  >
                    <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    Kembali
                  </button>
                ) : (
                  <div className="hidden sm:block" />
                )}

                {currentStep < totalSteps ? (
                  <button
                    onClick={handleNext}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-10 py-3.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold rounded-2xl hover:from-primary-700 hover:to-primary-800 transition-all duration-300 shadow-xl shadow-primary-200 hover:shadow-primary-300 group"
                  >
                    Selanjutnya
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto relative flex items-center justify-center gap-3 px-10 py-3.5 bg-gradient-to-r from-success-500 to-success-600 text-white font-bold rounded-2xl hover:from-success-600 hover:to-success-500 transition-all duration-300 shadow-xl shadow-green-200 hover:shadow-green-300 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden group"
                  >
                    {isSubmitting && (
                      <div className="absolute inset-0 shimmer-btn" />
                    )}
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Memproses...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        Kirim Pendaftaran
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Benefits / FAQ Section could go here for the landing page */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Kenapa Memilih Kami?</h2>
            <div className="w-20 h-1.5 bg-primary-500 mx-auto rounded-full" />
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex gap-4 p-6 rounded-3xl bg-slate-50 border border-slate-100">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                <Users className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h4 className="font-bold text-gray-800 mb-1">Mentor Berpengalaman</h4>
                <p className="text-sm text-gray-500 leading-relaxed">Dibimbing oleh Konsultan Berpengalaman.</p>
              </div>
            </div>
            <div className="flex gap-4 p-6 rounded-3xl bg-slate-50 border border-slate-100">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                <Target className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h4 className="font-bold text-gray-800 mb-1">Strategi Jitu</h4>
                <p className="text-sm text-gray-500 leading-relaxed">Analisis mendalam jalur zonasi, prestasi, dan afirmasi untuk peluang lulus tertinggi.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-primary-900 to-indigo-900 text-white/70 py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <GraduationCap className="w-6 h-6 text-accent-400" />
            <span className="text-white font-bold text-lg">Konsultasi SPMB 2026</span>
          </div>
          <p className="text-sm">
            © 2026 Konsultasi SPMB SMPN/SMAN/SMKN. All rights reserved.
          </p>
          <p className="text-xs mt-2 text-white/40">
            Membantu siswa Indonesia meraih sekolah impian
          </p>
        </div>
      </footer>

      {/* Success Modal */}
      <CheckStatusModal isOpen={showCheckStatus} onClose={() => setShowCheckStatus(false)} scriptUrl={SCRIPT_URL} />
      <DayaTampungModal isOpen={showDayaTampung} onClose={() => setShowDayaTampung(false)} />
      <SuccessModal
        isOpen={showSuccess}
        onClose={handleCloseSuccess}
        formData={{
          namaSiswa: formData.namaSiswa,
          sekolahTarget: formData.sekolahTarget,
          tempatKonsultasi: formData.tempatKonsultasi,
        }}
      />
    </div>
  );
}

export default App;
