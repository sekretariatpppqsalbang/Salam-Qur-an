import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed, don't show
  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#00C2A0] to-[#009b80] text-white text-xs font-bold shadow-md shadow-[#00C2A0]/25 hover:opacity-95 transition-all cursor-pointer"
        title="Pasang Aplikasi SALAM Quran di HP / Laptop"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install Aplikasi</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5 text-[#00C2A0]" />
          <span>Install di iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-[#3F4E5A]">Install di iPhone / iPad</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed space-y-2">
                1. Buka halaman ini di browser <strong>Safari</strong>.<br />
                2. Ketuk tombol <strong>Bagikan (Share)</strong> di bilah bawah.<br />
                3. Gulir ke bawah dan ketuk <strong>Tambah ke Layar Utama (Add to Home Screen)</strong>.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-[#00C2A0] py-2.5 text-xs font-bold text-white hover:bg-[#00a88b] transition-all"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
