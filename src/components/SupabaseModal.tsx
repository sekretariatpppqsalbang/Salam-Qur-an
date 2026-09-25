import React, { useState } from 'react';
import { getSupabaseConfig, saveSupabaseConfig, getSupabaseSqlSchema } from '../services/supabaseService';
import { Database, Check, Copy, ExternalLink, X, Sparkles, AlertCircle } from 'lucide-react';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose }) => {
  const current = getSupabaseConfig();
  const [url, setUrl] = useState(current.url);
  const [anonKey, setAnonKey] = useState(current.anonKey);
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseConfig({ url: url.trim(), anonKey: anonKey.trim() });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const copySql = () => {
    navigator.clipboard.writeText(getSupabaseSqlSchema());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-50 to-teal-50/50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00C2A0]/15 text-[#008f75] flex items-center justify-center font-bold">
              <Database className="w-5 h-5 text-[#00C2A0]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#3F4E5A]">Koneksi & Sinkronisasi Supabase</h3>
              <p className="text-xs text-slate-500">Deploy Vercel & Supabase Backend PostgreSQL</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200 text-xs text-[#3F4E5A] leading-relaxed">
            <p className="font-bold text-[#008f75] mb-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#00C2A0]" />
              Siap Deploy ke Vercel & Supabase
            </p>
            Aplikasi SALAM Quran telah dilengkapi penyimpanan lokal persisten berkecepatan tinggi, dan dapat langsung dihubungkan ke proyek <strong>Supabase</strong> Anda. Saat dideploy ke Vercel, cukup tambahkan Environment Variables <code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_ANON_KEY</code> di dashboard Vercel.
          </div>

          {/* Form Credentials */}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#3F4E5A] mb-1">
                Project URL Supabase (VITE_SUPABASE_URL)
              </label>
              <input
                type="text"
                placeholder="https://xyzcompany.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#00C2A0] focus:ring-2 focus:ring-[#00C2A0]/20 outline-none text-xs font-mono transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3F4E5A] mb-1">
                Anon Public Key (VITE_SUPABASE_ANON_KEY)
              </label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#00C2A0] focus:ring-2 focus:ring-[#00C2A0]/20 outline-none text-xs font-mono transition-all"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#00C2A0] text-white text-xs font-bold shadow-md shadow-[#00C2A0]/25 hover:opacity-95 transition-all"
              >
                {savedSuccess ? 'Tersimpan!' : 'Simpan Kredensial Supabase'}
              </button>
            </div>
          </form>

          {/* DDL Schema Viewer */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-[#3F4E5A]">Script SQL Schema Supabase</h4>
                <p className="text-[11px] text-slate-500">Jalankan di menu <strong>SQL Editor</strong> di Supabase Dashboard Anda</p>
              </div>
              <button
                type="button"
                onClick={copySql}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-[#3F4E5A] transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tersalin ke Clipboard!' : 'Salin SQL Schema'}</span>
              </button>
            </div>

            <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48 border border-slate-800">
              {getSupabaseSqlSchema()}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-xs font-semibold text-slate-700 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
