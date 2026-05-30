import React from 'react';
import { CheckCircle, X, PartyPopper } from 'lucide-react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: {
    namaSiswa: string;
    sekolahTarget: string[];
    tempatKonsultasi: string;
  };
}

const SuccessModal: React.FC<SuccessModalProps> = ({ isOpen, onClose, formData }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-fade-in-up overflow-hidden">
        {/* Decorative top gradient */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-primary-500 via-accent-400 to-success-500" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="text-center">
          {/* Success icon */}
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-success-500 to-primary-500 rounded-full flex items-center justify-center mb-5 shadow-lg animate-float">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>

          <div className="flex items-center justify-center gap-2 mb-3">
            <PartyPopper className="w-6 h-6 text-accent-500" />
            <h3 className="text-2xl font-bold text-gray-800">Pendaftaran Berhasil!</h3>
            <PartyPopper className="w-6 h-6 text-accent-500 scale-x-[-1]" />
          </div>

          <p className="text-gray-500 mb-6">
            Terima kasih telah mendaftar konsultasi SPMB 2026
          </p>

          {/* Summary */}
          <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-2xl p-5 mb-6 text-left space-y-3">
            <div>
              <p className="text-xs font-semibold text-primary-600 uppercase tracking-wide">Nama Siswa</p>
              <p className="text-gray-800 font-medium">{formData.namaSiswa}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-primary-600 uppercase tracking-wide">Sekolah Target</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {formData.sekolahTarget.map((school, i) => (
                  <span key={i} className="bg-primary-100 text-primary-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                    {school}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-primary-600 uppercase tracking-wide">Tempat Konsultasi</p>
              <p className="text-gray-800 font-medium">{formData.tempatKonsultasi}</p>
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-5">
            Tim kami akan segera menghubungi Anda melalui WhatsApp untuk jadwal konsultasi.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => window.open('https://chat.whatsapp.com/EzF6E0ENGz930av7tMd53T', '_blank')}
              className="flex-1 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Gabung Grup WhatsApp
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;
