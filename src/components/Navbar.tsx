import React, { useState } from 'react';
import { UserAccount } from '../types';
import { BookOpen, LogOut, Key, Database, ShieldCheck, UserCheck, Sparkles, AlertCircle } from 'lucide-react';
import { getSupabaseConfig } from '../services/supabaseService';

interface NavbarProps {
  currentUser: UserAccount;
  onLogout: () => void;
  onChangePasswordClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  onChangePasswordClick,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const getRoleBadge = () => {
    switch (currentUser.role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            Admin Sekolah
          </span>
        );
      case 'guru':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <BookOpen className="w-3.5 h-3.5" />
            Guru
          </span>
        );
      case 'wali':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200">
            <UserCheck className="w-3.5 h-3.5" />
            Wali Murid ({currentUser.className || 'Siswa'})
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#3F4E5A]/10 shadow-xs no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & School Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#00C2A0] to-[#008f75] flex items-center justify-center text-white shadow-md shadow-[#00C2A0]/25">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-[#3F4E5A]">
                  SALAM <span className="text-[#00C2A0]">Quran</span>
                </span>
              </div>
              <p className="text-xs text-[#3F4E5A]/75 font-medium leading-tight line-clamp-1">
                SD Islam Terpadu Salsabila 3 Banguntapan
              </p>
            </div>
          </div>

          {/* Right Actions & User Profile */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Default Password Warning */}
            {currentUser.isDefaultPassword && (
              <button
                onClick={onChangePasswordClick}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors animate-pulse-subtle"
                title="Ganti password default salsabila3"
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Ganti Password</span>
              </button>
            )}

            {/* User Info Capsule */}
            <div className="relative">
              <div
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 cursor-pointer transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-[#00C2A0]/15 text-[#008f75] font-bold flex items-center justify-center text-sm">
                  {currentUser.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-[#3F4E5A] truncate max-w-[160px]">
                    {currentUser.fullName}
                  </div>
                  <div className="text-[11px] leading-tight">
                    {getRoleBadge()}
                  </div>
                </div>
              </div>

              {/* Dropdown Menu */}
              {menuOpen && (
                <div
                  onMouseLeave={() => setMenuOpen(false)}
                  className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                >
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-xs font-medium text-slate-500">Akun Pengguna</p>
                    <p className="text-sm font-bold text-[#3F4E5A] truncate">{currentUser.fullName}</p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">@{currentUser.username}</p>
                    <div className="mt-2">{getRoleBadge()}</div>
                  </div>

                  <div className="p-1">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onChangePasswordClick();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#3F4E5A] hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      <Key className="w-4 h-4 text-[#00C2A0]" />
                      <span>Ubah Password Akun</span>
                      {currentUser.isDefaultPassword && (
                        <span className="ml-auto text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">
                          Default
                        </span>
                      )}
                    </button>
                  </div>

                  <div className="p-1 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Keluar (Logout)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Logout direct button for quick access */}
            <button
              onClick={onLogout}
              title="Keluar"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
