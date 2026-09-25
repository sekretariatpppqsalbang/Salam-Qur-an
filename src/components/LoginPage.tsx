import React, { useState } from 'react';
import { UserAccount, Teacher, Student } from '../types';
import { authenticate, getTeachers, getStudents, DEFAULT_PASSWORD } from '../services/storageService';
import { BookOpen, UserCheck, ShieldCheck, Lock, User, ArrowRight, Sparkles, Check, ChevronDown, Search } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: UserAccount) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'guru' | 'wali' | 'admin'>('guru');
  const [username, setUsername] = useState('annisa.galuh');
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Quick helper for wali selection
  const [waliClassFilter, setWaliClassFilter] = useState('1A');
  const [waliSearchQuery, setWaliSearchQuery] = useState('');

  const teachers = getTeachers();
  const students = getStudents();

  // Filter students for the wali selector helper
  const classStudents = students.filter(s => {
    const matchClass = waliClassFilter ? s.className === waliClassFilter : true;
    const matchSearch = waliSearchQuery ? s.name.toLowerCase().includes(waliSearchQuery.toLowerCase()) : true;
    return matchClass && matchSearch;
  });

  const handleTabChange = (tab: 'guru' | 'wali' | 'admin') => {
    setActiveTab(tab);
    setError('');
    setPassword(DEFAULT_PASSWORD);

    if (tab === 'guru') {
      setUsername('annisa.galuh');
    } else if (tab === 'wali') {
      const sample1A = students.find(s => s.className === '1A');
      setUsername(sample1A ? sample1A.waliUsername : 'wali.1A.abimanyu.fachri.christianto');
    } else {
      setUsername('admin');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      const result = authenticate(username, password);
      setLoading(false);

      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setError(result.error || 'Username atau password salah.');
      }
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDFDFD] via-slate-50 to-teal-50/30 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      
      {/* Top Banner */}
      <div className="max-w-5xl mx-auto w-full flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00C2A0] to-[#008f75] flex items-center justify-center text-white shadow-md shadow-[#00C2A0]/25">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-[#3F4E5A]">
              SALAM <span className="text-[#00C2A0]">Quran</span>
            </h1>
            <p className="text-[11px] font-semibold text-[#008f75]">SD Islam Terpadu Salsabila 3 Banguntapan</p>
          </div>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto my-6 bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
        
        {/* Card Header */}
        <div className="px-6 pt-8 pb-5 text-center">
          <div className="inline-flex p-3 rounded-2xl bg-teal-50 text-[#00C2A0] mb-3">
            <BookOpen className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#3F4E5A] tracking-tight">
            Selamat Datang
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Sistem Informasi & Input Laporan Hasil Hafalan Siswa
          </p>
        </div>

        {/* Role Switcher Tabs */}
        <div className="px-6">
          <div className="p-1 bg-slate-100 rounded-2xl flex gap-1">
            <button
              type="button"
              onClick={() => handleTabChange('guru')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'guru'
                  ? 'bg-white text-[#008f75] shadow-xs'
                  : 'text-slate-500 hover:text-[#3F4E5A]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Guru</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('wali')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'wali'
                  ? 'bg-white text-[#008f75] shadow-xs'
                  : 'text-slate-500 hover:text-[#3F4E5A]'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Wali Siswa</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('admin')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'admin'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-500 hover:text-[#3F4E5A]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Context Helper depending on Role */}
            {activeTab === 'guru' && (
              <div>
                <label className="block text-xs font-semibold text-[#3F4E5A] mb-1">
                  Pilih Guru Pengampu
                </label>
                <div className="relative mb-2">
                  <select
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-[#3F4E5A] focus:border-[#00C2A0] focus:ring-2 focus:ring-[#00C2A0]/20 outline-none appearance-none cursor-pointer"
                  >
                    {teachers.map((t) => (
                      <option key={t.id} value={t.username}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                </div>
                <p className="text-[11px] text-slate-400">
                  Username login: <code className="font-mono text-[#008f75]">{username}</code>
                </p>
              </div>
            )}

            {activeTab === 'wali' && (
              <div className="space-y-3">
                <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-100 text-[11px] text-[#3F4E5A] leading-relaxed">
                  <p className="font-bold text-[#008f75] mb-1">Format Login Wali Murid:</p>
                  <code>wali.(Kelas).(Nama siswa)</code>
                  <p className="mt-1 text-slate-500">Pilih dari daftar di bawah untuk login instan atau ketik manual.</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kelas</label>
                    <select
                      value={waliClassFilter}
                      onChange={(e) => setWaliClassFilter(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                    >
                      {['1A', '1B', '1C', '2A', '2B', '2C', '3A', '3B', '3C', '4A', '4B', '4C', '5A', '5B', '5C', '5D', '6A', '6B', '6C'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Pilih Siswa</label>
                    <select
                      onChange={(e) => {
                        const sel = students.find(s => s.id === e.target.value);
                        if (sel) setUsername(sel.waliUsername);
                      }}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white truncate"
                    >
                      <option value="">-- Pilih Siswa --</option>
                      {classStudents.slice(0, 30).map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#3F4E5A] mb-1">
                    Username Wali
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="wali.1A.nama_siswa"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:border-[#00C2A0] focus:ring-2 focus:ring-[#00C2A0]/20 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'admin' && (
              <div>
                <label className="block text-xs font-semibold text-[#3F4E5A] mb-1">
                  Username Admin
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:border-[#00C2A0] focus:ring-2 focus:ring-[#00C2A0]/20 outline-none"
                  />
                </div>
              </div>
            )}

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#3F4E5A]">
                  Password
                </label>
                <span className="text-[11px] text-[#008f75] font-medium">
                  Default: <strong className="font-mono">salsabila3</strong>
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:border-[#00C2A0] focus:ring-2 focus:ring-[#00C2A0]/20 outline-none"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#00C2A0] to-[#009b80] text-white text-xs font-bold shadow-lg shadow-[#00C2A0]/25 hover:opacity-95 transition-all flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Memverifikasi...' : 'Masuk ke Aplikasi'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </form>
        </div>

        {/* Card Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-500">
            Perlu bantuan akun? Hubungi Admin Qur'an SDIT Salsabila 3
          </p>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="text-center py-2 text-xs text-slate-400">
        SALAM Quran &bull; SD Islam Terpadu Salsabila 3 Banguntapan &bull; Bantul, D.I. Yogyakarta
      </div>
    </div>
  );
};
