import React, { useState } from 'react';
import { UserAccount } from '../types';
import { changeUserPassword, DEFAULT_PASSWORD } from '../services/storageService';
import { Key, Eye, EyeOff, CheckCircle2, AlertCircle, X, ShieldAlert } from 'lucide-react';

interface ChangePasswordModalProps {
  currentUser: UserAccount;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [oldPassword, setOldPassword] = useState(currentUser.isDefaultPassword ? DEFAULT_PASSWORD : '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Sync if currentUser changes
  React.useEffect(() => {
    if (currentUser.isDefaultPassword) {
      setOldPassword(DEFAULT_PASSWORD);
    }
  }, [currentUser]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Check old password
    const currentActual = currentUser.password || DEFAULT_PASSWORD;
    if (oldPassword !== currentActual) {
      setError('Password saat ini salah.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password baru minimal 6 karakter.');
      return;
    }

    if (newPassword === DEFAULT_PASSWORD) {
      setError('Password baru tidak boleh sama dengan password default (salsabila3).');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password baru tidak cocok.');
      return;
    }

    const ok = changeUserPassword(currentUser.id, newPassword);
    if (ok) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onSuccess();
        onClose();
      }, 1400);
    } else {
      setError('Gagal memperbarui password.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-50 to-teal-50/40 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00C2A0]/15 text-[#008f75] flex items-center justify-center font-bold">
              <Key className="w-5 h-5 text-[#00C2A0]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#3F4E5A]">Ubah Password Akun</h3>
              <p className="text-xs text-slate-500">Akun: {currentUser.fullName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentUser.isDefaultPassword && (
            <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <span className="font-bold">Perhatian Keamanan:</span> Akun Anda saat ini masih menggunakan password default (<code className="font-mono bg-white px-1 py-0.5 rounded border border-amber-300">salsabila3</code>). Demi keamanan data, harap ganti dengan password pribadi yang aman.
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Password berhasil diperbarui! Menyimpan...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#3F4E5A] mb-1">
                Password Saat Ini / Default
              </label>
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Masukkan salsabila3 jika belum pernah ganti"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#00C2A0] focus:ring-2 focus:ring-[#00C2A0]/20 outline-none text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3F4E5A] mb-1">
                Password Baru
              </label>
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#00C2A0] focus:ring-2 focus:ring-[#00C2A0]/20 outline-none text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3F4E5A] mb-1">
                Konfirmasi Password Baru
              </label>
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#00C2A0] focus:ring-2 focus:ring-[#00C2A0]/20 outline-none text-sm transition-all"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="text-xs text-slate-500 hover:text-[#00C2A0] flex items-center gap-1.5 transition-colors"
              >
                {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPass ? 'Sembunyikan password' : 'Lihat karakter'}</span>
              </button>
            </div>

            <div className="pt-3 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={success}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#00C2A0] to-[#00a88b] text-white text-xs font-bold shadow-md shadow-[#00C2A0]/25 hover:opacity-95 transition-all disabled:opacity-50"
              >
                Simpan Password Baru
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
