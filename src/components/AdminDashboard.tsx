import React, { useState, useMemo } from 'react';
import { UserAccount, Student, Teacher } from '../types';
import { CLASS_LIST } from '../data/initialData';
import {
  getStudents,
  addStudent,
  deleteStudent,
  getTeachers,
  addTeacher,
  deleteTeacher,
  getUserAccounts,
  resetUserPassword,
  resetAllPasswordsToDefault,
  importStudentsFromFile,
  DEFAULT_PASSWORD,
} from '../services/storageService';
import { getSupabaseSqlSchema } from '../services/supabaseService';
import * as XLSX from 'xlsx';
import {
  Users,
  GraduationCap,
  ShieldCheck,
  RotateCcw,
  Upload,
  Download,
  Plus,
  Trash2,
  Search,
  Key,
  CheckCircle2,
  AlertCircle,
  Code2,
  Copy,
  Check,
  Database,
  Sparkles,
} from 'lucide-react';

interface AdminDashboardProps {
  currentUser: UserAccount;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'siswa' | 'guru' | 'reset-password' | 'upload' | 'sql-code'>('siswa');
  const [students, setStudents] = useState<Student[]>(() => getStudents());
  const [teachers, setTeachers] = useState<Teacher[]>(() => getTeachers());
  const [users, setUsers] = useState<UserAccount[]>(() => getUserAccounts());
  const [copiedSql, setCopiedSql] = useState(false);

  // Siswa Management States
  const [studentClassFilter, setStudentClassFilter] = useState('1A');
  const [studentSearch, setStudentSearch] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentClass, setNewStudentClass] = useState('1A');

  // Guru Management States
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherTitle, setNewTeacherTitle] = useState('Guru Qur\'an');

  // Feedback states
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Sync listener
  React.useEffect(() => {
    const handleStorageChange = () => {
      setStudents(getStudents());
      setTeachers(getTeachers());
      setUsers(getUserAccounts());
    };
    window.addEventListener('salam_storage_changed', handleStorageChange);
    return () => window.removeEventListener('salam_storage_changed', handleStorageChange);
  }, []);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Add single student
  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    addStudent(newStudentName.trim(), newStudentClass);
    setNewStudentName('');
    showFeedback('success', `Siswa ${newStudentName.toUpperCase()} berhasil ditambahkan ke kelas ${newStudentClass}!`);
  };

  // Delete student
  const handleDeleteStudent = (student: Student) => {
    if (confirm(`Hapus data siswa ${student.name} dari kelas ${student.className}?`)) {
      deleteStudent(student.id);
      showFeedback('success', `Data siswa ${student.name} berhasil dihapus.`);
    }
  };

  // Add teacher
  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName.trim()) return;

    addTeacher(newTeacherName.trim(), newTeacherTitle.trim());
    setNewTeacherName('');
    showFeedback('success', `Guru ${newTeacherName} berhasil ditambahkan!`);
  };

  // Delete teacher
  const handleDeleteTeacher = (teacher: Teacher) => {
    if (confirm(`Hapus guru ${teacher.name}?`)) {
      deleteTeacher(teacher.id);
      showFeedback('success', `Guru ${teacher.name} berhasil dihapus.`);
    }
  };

  // Reset single password
  const handleResetPassword = (user: UserAccount) => {
    if (confirm(`Reset password untuk ${user.fullName} ke default (${DEFAULT_PASSWORD})?`)) {
      resetUserPassword(user.id);
      setUsers(getUserAccounts());
      showFeedback('success', `Password ${user.fullName} berhasil di-reset ke "${DEFAULT_PASSWORD}".`);
    }
  };

  // Bulk reset all passwords
  const handleResetAllPasswords = () => {
    if (confirm(`PENTING: Apakah Anda yakin ingin me-reset SEMUA akun siswa & guru ke password default (${DEFAULT_PASSWORD})?`)) {
      resetAllPasswordsToDefault();
      setUsers(getUserAccounts());
      showFeedback('success', `Seluruh password akun telah di-reset ke "${DEFAULT_PASSWORD}".`);
    }
  };

  // Mass File Upload (CSV/Excel)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const result = await importStudentsFromFile(file);
    setIsUploading(false);

    if (result.count > 0) {
      showFeedback('success', `Berhasil mengimpor ${result.count} data siswa dari file ${file.name}!`);
      setStudents(getStudents());
      e.target.value = '';
    } else {
      showFeedback('error', result.error || 'Gagal membaca format file. Pastikan kolom memuat "Nama" dan "Kelas".');
    }
  };

  // Download Sample Template for Bulk Import
  const handleDownloadTemplate = () => {
    const templateData = [
      { 'Nama Siswa': 'MUHAMMAD AL FATIH', 'Kelas': '1A' },
      { 'Nama Siswa': 'AISYAH AZ ZAHRA', 'Kelas': '1A' },
      { 'Nama Siswa': 'IBRAHIM AL AZZAMY', 'Kelas': '1B' },
      { 'Nama Siswa': 'FATIMAH AZALEA', 'Kelas': '2A' },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Template_Import_Siswa_SDIT_Salsabila3.xlsx');
  };

  // Filtered Students for Management
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchClass = studentClassFilter === 'Semua' ? true : s.className === studentClassFilter;
      const matchSearch = studentSearch ? s.name.toLowerCase().includes(studentSearch.toLowerCase()) : true;
      return matchClass && matchSearch;
    });
  }, [students, studentClassFilter, studentSearch]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-[#3F4E5A] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-purple-200 text-xs font-bold mb-3 border border-white/10">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>Panel Administrasi & Pengaturan Master Data</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Administrator Sekolah SDIT Salsabila 3
          </h2>
          <p className="text-xs sm:text-sm text-purple-200/90 mt-1 max-w-2xl">
            Kelola master data 19 kelas, 18 guru Qur'an, ratusan siswa, reset password akun ke <code>salsabila3</code>, serta upload massal via CSV/Excel.
          </p>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-3 animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('siswa')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'siswa' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Kelola Siswa ({students.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('guru')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'guru' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Kelola Guru ({teachers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reset-password')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'reset-password' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>Reset Password Akun</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'upload' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Unggah CSV / Excel Massal</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sql-code')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'sql-code' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>Skrip SQL Realtime</span>
        </button>
      </div>

      {/* TAB 1: KELOLA SISWA */}
      {activeTab === 'siswa' && (
        <div className="space-y-6">
          
          {/* Add Student Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80">
            <h3 className="text-sm font-bold text-[#3F4E5A] mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#00C2A0]" />
              <span>Tambah Siswa Baru</span>
            </h3>
            <form onSubmit={handleAddStudent} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-3">
                <select
                  value={newStudentClass}
                  onChange={(e) => setNewStudentClass(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                >
                  {CLASS_LIST.map((c) => (
                    <option key={c} value={c}>
                      Kelas {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-6">
                <input
                  type="text"
                  required
                  placeholder="Nama Lengkap Siswa (Contoh: ABIMANYU FACHRI)"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold uppercase"
                />
              </div>

              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#00C2A0] text-white text-xs font-bold hover:bg-[#00a88b] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Siswa</span>
                </button>
              </div>
            </form>
          </div>

          {/* Student Table with Filters */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-slate-600">Filter Kelas:</label>
                <select
                  value={studentClassFilter}
                  onChange={(e) => setStudentClassFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                >
                  <option value="Semua">Semua Kelas</option>
                  {CLASS_LIST.map((c) => (
                    <option key={c} value={c}>
                      Kelas {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nama siswa..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:border-[#00C2A0] outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto mt-4 max-h-[500px]">
              <table className="w-full text-xs text-left">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                  <tr className="text-slate-600 font-bold">
                    <th className="py-2.5 px-3 w-12">No</th>
                    <th className="py-2.5 px-3">Nama Siswa</th>
                    <th className="py-2.5 px-3 text-center w-20">Kelas</th>
                    <th className="py-2.5 px-3">Username Wali</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-[#3F4E5A]">{s.name}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-teal-50 text-[#008f75] font-bold">
                          {s.className}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">{s.waliUsername}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleDeleteStudent(s)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                          title="Hapus Siswa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KELOLA GURU */}
      {activeTab === 'guru' && (
        <div className="space-y-6">
          
          {/* Add Teacher Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80">
            <h3 className="text-sm font-bold text-[#3F4E5A] mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#00C2A0]" />
              <span>Tambah Guru Qur'an Baru</span>
            </h3>
            <form onSubmit={handleAddTeacher} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-6">
                <input
                  type="text"
                  required
                  placeholder="Nama Lengkap & Gelar (Contoh: Ahmad Busyairi, S.H.)"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                />
              </div>

              <div className="sm:col-span-3">
                <input
                  type="text"
                  placeholder="Jabatan (Guru Qur'an / Koordinator)"
                  value={newTeacherTitle}
                  onChange={(e) => setNewTeacherTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                />
              </div>

              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#00C2A0] text-white text-xs font-bold hover:bg-[#00a88b] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Guru</span>
                </button>
              </div>
            </form>
          </div>

          {/* Teacher Table */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80">
            <h3 className="text-sm font-bold text-[#3F4E5A] mb-4">
              Daftar Guru Qur'an SDIT Salsabila 3 Banguntapan ({teachers.length} Guru)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-slate-600 font-bold">
                    <th className="py-2.5 px-3 w-12">No</th>
                    <th className="py-2.5 px-3">Nama Guru Lengkap</th>
                    <th className="py-2.5 px-3">Jabatan</th>
                    <th className="py-2.5 px-3">Username Login</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teachers.map((t, idx) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-3 font-bold text-[#3F4E5A]">{t.name}</td>
                      <td className="py-3 px-3 font-medium text-slate-600">{t.title}</td>
                      <td className="py-3 px-3 font-mono text-teal-700 text-[11px] font-bold">
                        {t.username}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleDeleteTeacher(t)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                          title="Hapus Guru"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RESET PASSWORD AKUN */}
      {activeTab === 'reset-password' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-[#3F4E5A]">
                Reset Password Akun Siswa & Guru
              </h3>
              <p className="text-xs text-slate-500">
                Password default seluruh akun adalah <code className="font-mono font-bold text-[#008f75]">salsabila3</code>
              </p>
            </div>

            <button
              onClick={handleResetAllPasswords}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-all cursor-pointer shadow-md shadow-rose-600/20"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset SEMUA Akun ke Default ({DEFAULT_PASSWORD})</span>
            </button>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-xs text-left">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                <tr className="text-slate-600 font-bold">
                  <th className="py-2.5 px-3">Nama Pengguna</th>
                  <th className="py-2.5 px-3">Peran</th>
                  <th className="py-2.5 px-3">Username</th>
                  <th className="py-2.5 px-3 text-center">Status Password</th>
                  <th className="py-2.5 px-3 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.slice(0, 50).map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-bold text-[#3F4E5A]">{u.fullName}</td>
                    <td className="py-3 px-3 uppercase text-[10px] font-bold text-slate-500">
                      {u.role}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-600">{u.username}</td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.isDefaultPassword ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {u.isDefaultPassword ? 'Password Default' : 'Password Khusus'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleResetPassword(u)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-amber-400 bg-slate-50 hover:bg-amber-50 text-[11px] font-semibold text-slate-700 transition-colors"
                      >
                        Reset ke {DEFAULT_PASSWORD}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: UNGGAH DATA MASSAL VIA CSV / EXCEL */}
      {activeTab === 'upload' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
          <div className="max-w-2xl">
            <h3 className="text-base font-bold text-[#3F4E5A]">
              Unggah File CSV / Excel Massal
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Impor data siswa secara sekaligus untuk menghemat waktu. Format file harus memuat kolom <code className="font-mono text-[#008f75]">Nama Siswa</code> dan <code className="font-mono text-[#008f75]">Kelas</code>.
            </p>
          </div>

          <div className="border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center bg-slate-50/50 hover:bg-teal-50/30 transition-colors">
            <Upload className="w-10 h-10 text-[#00C2A0] mx-auto mb-3" />
            <p className="text-sm font-bold text-[#3F4E5A]">
              Pilih file CSV atau Excel (.xlsx) dari komputer Anda
            </p>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Maksimal 1.000 baris per file
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00C2A0] text-white text-xs font-bold hover:bg-[#00a88b] transition-all shadow-md shadow-[#00C2A0]/25">
                <Upload className="w-4 h-4" />
                <span>{isUploading ? 'Sedang Memproses...' : 'Pilih File Excel / CSV'}</span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Contoh Template Excel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SKRIP SQL REALTIME SUPABASE */}
      {activeTab === 'sql-code' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-[#008f75] text-xs font-bold mb-2">
                <Database className="w-3.5 h-3.5 text-[#00C2A0]" />
                <span>PostgreSQL + Supabase Realtime CDC</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#3F4E5A]">
                Skrip SQL Schema & Realtime Supabase
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                Gunakan skrip DDL ini di Supabase SQL Editor untuk membuat tabel dan mengaktifkan sinkronisasi data seketika (<code className="font-mono text-[#008f75]">supabase_realtime</code>).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(getSupabaseSqlSchema());
                  setCopiedSql(true);
                  setTimeout(() => setCopiedSql(false), 2500);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00C2A0] text-white text-xs font-bold hover:bg-[#00a88b] transition-all cursor-pointer shadow-md shadow-[#00C2A0]/20"
              >
                {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSql ? 'Tersalin ke Clipboard!' : 'Salin Seluruh SQL'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const blob = new Blob([getSupabaseSqlSchema()], { type: 'text/plain;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'salam_quran_supabase_realtime.sql';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh File .sql</span>
              </button>
            </div>
          </div>

          {/* Quick Step Guide */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div className="w-6 h-6 rounded-lg bg-teal-100 text-[#008f75] font-black text-center leading-6 mb-2">1</div>
              <p className="font-bold text-slate-800 mb-1">Buka Supabase</p>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Login ke dashboard Supabase Anda dan pilih project yang digunakan.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div className="w-6 h-6 rounded-lg bg-teal-100 text-[#008f75] font-black text-center leading-6 mb-2">2</div>
              <p className="font-bold text-slate-800 mb-1">Menu SQL Editor</p>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Pilih menu <strong>SQL Editor</strong> di bilah navigasi kiri, lalu buat <strong>New Query</strong>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div className="w-6 h-6 rounded-lg bg-teal-100 text-[#008f75] font-black text-center leading-6 mb-2">3</div>
              <p className="font-bold text-slate-800 mb-1">Tempel & Klik RUN</p>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Tempelkan skrip di bawah ini lalu tekan tombol <strong>RUN</strong>. Tabel otomatis aktif secara realtime!
              </p>
            </div>
          </div>

          {/* Code Viewer */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-md">
            <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                <span className="ml-2 text-slate-300 font-semibold">schema_realtime.sql</span>
              </div>
              <span className="text-[11px] text-teal-400 font-sans font-medium">PostgreSQL DDL + CDC</span>
            </div>

            <pre className="bg-slate-900 text-emerald-400 p-5 text-xs font-mono overflow-x-auto max-h-[480px] leading-relaxed select-all">
              {getSupabaseSqlSchema()}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
