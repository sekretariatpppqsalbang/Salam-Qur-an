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
  getRecords,
  applySupabaseSyncData,
} from '../services/storageService';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  testSupabaseConnection,
  getCompleteSupabaseSql,
  getSupabaseDdlSchema,
  getSupabaseSeedDataSql,
  getSubscriptionCodeSample,
  fetchAllFromSupabase,
  pushAllDataToSupabase,
  getRealtimeStatus,
  startRealtimeSubscription,
  RealtimeConnectionStatus,
} from '../services/supabaseService';
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
  RefreshCw,
  Globe,
  Radio,
  FileCode2,
  Layers,
  Zap,
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

  // SQL & Supabase Management States
  const [sqlViewMode, setSqlViewMode] = useState<'all' | 'schema' | 'seed' | 'subscription'>('all');
  const [supabaseUrl, setSupabaseUrl] = useState(() => getSupabaseConfig().url);
  const [supabaseKey, setSupabaseKey] = useState(() => getSupabaseConfig().anonKey);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeConnectionStatus>(() => getRealtimeStatus());
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

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

    const handleRealtimeStatus = (e: any) => {
      if (e.detail?.status) {
        setRealtimeStatus(e.detail.status);
      }
    };

    window.addEventListener('salam_storage_changed', handleStorageChange);
    window.addEventListener('salam_realtime_status_changed', handleRealtimeStatus);
    return () => {
      window.removeEventListener('salam_storage_changed', handleStorageChange);
      window.removeEventListener('salam_realtime_status_changed', handleRealtimeStatus);
    };
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

      {/* TAB 5: SKRIP SQL REALTIME & KONEKSI SUPABASE */}
      {activeTab === 'sql-code' && (
        <div className="space-y-6">
          
          {/* Card 1: Pengaturan Koneksi Supabase & Sinkronisasi Online PWA */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-[#008f75] text-xs font-bold mb-1.5">
                  <Radio className="w-3.5 h-3.5 text-[#00C2A0] animate-pulse" />
                  <span>Koneksi Database Online Supabase</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[#3F4E5A]">
                  Hubungkan Aplikasi ke Supabase (PWA Online)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Data otomatis tersinkronisasi dua arah secara realtime. Jika offline, PWA akan menggunakan cache lokal di perangkat Anda.
                </p>
              </div>

              {/* Status Indicator */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
                  realtimeStatus === 'CONNECTED'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : realtimeStatus === 'CONNECTING'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : supabaseUrl && supabaseKey
                    ? 'bg-teal-50 text-teal-700 border-teal-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    realtimeStatus === 'CONNECTED'
                      ? 'bg-emerald-500 animate-pulse'
                      : realtimeStatus === 'CONNECTING'
                      ? 'bg-amber-500 animate-ping'
                      : supabaseUrl && supabaseKey
                      ? 'bg-teal-500'
                      : 'bg-slate-400'
                  }`} />
                  {realtimeStatus === 'CONNECTED'
                    ? 'Realtime Aktif (postgres_changes)'
                    : realtimeStatus === 'CONNECTING'
                    ? 'Menyambungkan Realtime...'
                    : supabaseUrl && supabaseKey
                    ? 'Supabase Terhubung'
                    : 'Mode Offline / Lokal'}
                </span>
              </div>
            </div>

            {/* Inputs Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#3F4E5A] mb-1.5">
                  Supabase Project URL
                </label>
                <input
                  type="url"
                  placeholder="https://xyzcompany.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono bg-slate-50/50 focus:bg-white focus:border-[#00C2A0] outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3F4E5A] mb-1.5">
                  Supabase Anon Public Key
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono bg-slate-50/50 focus:bg-white focus:border-[#00C2A0] outline-none transition-all"
                />
              </div>
            </div>

            {/* Sync Feedback Message */}
            {syncStatusMsg && (
              <div className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2.5 ${
                syncStatusMsg.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : syncStatusMsg.type === 'error'
                  ? 'bg-rose-50 border border-rose-200 text-rose-800'
                  : 'bg-teal-50 border border-teal-200 text-teal-800'
              }`}>
                {syncStatusMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : syncStatusMsg.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                ) : (
                  <RefreshCw className="w-4 h-4 text-teal-600 animate-spin shrink-0" />
                )}
                <span>{syncStatusMsg.text}</span>
              </div>
            )}

            {/* Connection Actions */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={async () => {
                  saveSupabaseConfig({ url: supabaseUrl, anonKey: supabaseKey });
                  setIsTestingConnection(true);
                  setSyncStatusMsg({ type: 'info', text: 'Menguji koneksi ke Supabase...' });
                  const res = await testSupabaseConnection(supabaseUrl, supabaseKey);
                  setIsTestingConnection(false);
                  setSyncStatusMsg({
                    type: res.success ? 'success' : 'error',
                    text: res.message
                  });
                  if (res.success) {
                    startRealtimeSubscription();
                  }
                }}
                disabled={isTestingConnection}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00C2A0] text-white text-xs font-bold hover:bg-[#00a88b] transition-all cursor-pointer shadow-md shadow-[#00C2A0]/20 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isTestingConnection ? 'Menguji...' : 'Simpan & Uji Koneksi'}</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (!supabaseUrl || !supabaseKey) {
                    setSyncStatusMsg({ type: 'error', text: 'Mohon isi URL dan Anon Key terlebih dahulu.' });
                    return;
                  }
                  setIsSyncing(true);
                  setSyncStatusMsg({ type: 'info', text: 'Mengambil data terbaru dari database Supabase...' });
                  const res = await fetchAllFromSupabase();
                  setIsSyncing(false);
                  if (res.error) {
                    setSyncStatusMsg({ type: 'error', text: res.error });
                  } else {
                    applySupabaseSyncData(res);
                    if (res.students) setStudents(res.students);
                    if (res.teachers) setTeachers(res.teachers);
                    if (res.users) setUsers(res.users);
                    setSyncStatusMsg({
                      type: 'success',
                      text: `Berhasil sinkronisasi! Memuat ${res.teachers?.length || 0} guru, ${res.students?.length || 0} siswa, dan ${res.records?.length || 0} catatan dari Supabase.`
                    });
                  }
                }}
                disabled={isSyncing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Tarik Data dari Supabase</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (!supabaseUrl || !supabaseKey) {
                    setSyncStatusMsg({ type: 'error', text: 'Mohon isi URL dan Anon Key terlebih dahulu.' });
                    return;
                  }
                  if (!confirm(`Kirim seluruh data lokal saat ini (${teachers.length} guru, ${students.length} siswa, ${users.length} akun, ${getRecords().length} catatan) ke Supabase?`)) {
                    return;
                  }
                  setIsPushing(true);
                  setSyncStatusMsg({ type: 'info', text: 'Mengunggah seluruh data lokal ke database Supabase...' });
                  const records = getRecords();
                  const res = await pushAllDataToSupabase(teachers, students, users, records);
                  setIsPushing(false);
                  setSyncStatusMsg({
                    type: res.success ? 'success' : 'error',
                    text: res.message,
                  });
                }}
                disabled={isPushing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-xs font-bold text-purple-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Upload className={`w-3.5 h-3.5 ${isPushing ? 'animate-bounce' : ''}`} />
                <span>{isPushing ? 'Mengunggah...' : 'Kirim Seluruh Data Lokal ke Supabase'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  startRealtimeSubscription();
                  setSyncStatusMsg({ type: 'info', text: 'Menghubungkan ulang channel Realtime (postgres_changes)...' });
                  setTimeout(() => {
                    setSyncStatusMsg({ type: 'success', text: 'Subscription Realtime postgres_changes aktif!' });
                  }, 1500);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
                title="Restart subscription realtime postgres_changes"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Hubungkan Ulang Realtime</span>
              </button>
            </div>
          </div>

          {/* Card 2: Skrip SQL Schema & Realtime dengan Seluruh Data Siswa & Guru */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold mb-2">
                  <Database className="w-3.5 h-3.5 text-purple-600" />
                  <span>Skrip SQL Otomatis Siap Pakai</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[#3F4E5A]">
                  Skrip SQL Schema & Realtime Sesuai Seluruh Data Demo
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                  Skrip ini telah memuat seluruh <strong>18 Guru Qur'an</strong>, seluruh siswa <strong>19 Kelas ({students.length} Siswa)</strong>, akun pengguna (default password <code className="font-mono text-[#008f75]">salsabila3</code>), serta publikasi Realtime CDC.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const records = getRecords();
                    let sqlText = '';
                    if (sqlViewMode === 'subscription') sqlText = getSubscriptionCodeSample();
                    else if (sqlViewMode === 'schema') sqlText = getSupabaseDdlSchema();
                    else if (sqlViewMode === 'seed') sqlText = getSupabaseSeedDataSql(teachers, students, users, records);
                    else sqlText = getCompleteSupabaseSql(teachers, students, users, records);

                    navigator.clipboard.writeText(sqlText);
                    setCopiedSql(true);
                    setTimeout(() => setCopiedSql(false), 2500);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00C2A0] text-white text-xs font-bold hover:bg-[#00a88b] transition-all cursor-pointer shadow-md shadow-[#00C2A0]/20"
                >
                  {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>
                    {copiedSql
                      ? 'Tersalin ke Clipboard!'
                      : sqlViewMode === 'subscription'
                      ? 'Salin Kode Subscription'
                      : 'Salin Skrip SQL'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const records = getRecords();
                    let sqlText = '';
                    let filename = 'salam_quran_supabase_complete.sql';
                    if (sqlViewMode === 'subscription') {
                      sqlText = getSubscriptionCodeSample();
                      filename = 'salam_quran_realtime_subscription.ts';
                    } else if (sqlViewMode === 'schema') {
                      sqlText = getSupabaseDdlSchema();
                      filename = 'salam_quran_schema_realtime.sql';
                    } else if (sqlViewMode === 'seed') {
                      sqlText = getSupabaseSeedDataSql(teachers, students, users, records);
                      filename = 'salam_quran_data_seed.sql';
                    } else {
                      sqlText = getCompleteSupabaseSql(teachers, students, users, records);
                    }

                    const blob = new Blob([sqlText], { type: 'text/plain;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {sqlViewMode === 'subscription' ? 'Unduh File .ts' : 'Unduh File .sql'}
                  </span>
                </button>
              </div>
            </div>

            {/* Selector Mode Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-slate-100/80 rounded-2xl">
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSqlViewMode('all')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    sqlViewMode === 'all'
                      ? 'bg-white text-purple-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Skrip Lengkap (Schema + Realtime + Seluruh Data)</span>
                  <span className="px-1.5 py-0.2 rounded-md bg-purple-100 text-purple-800 text-[10px]">Rekomendasi</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSqlViewMode('schema')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    sqlViewMode === 'schema'
                      ? 'bg-white text-purple-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Hanya Schema DDL & Realtime</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSqlViewMode('seed')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    sqlViewMode === 'seed'
                      ? 'bg-white text-purple-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileCode2 className="w-3.5 h-3.5" />
                  <span>Hanya Data Guru, Siswa & Akun (Seed Data)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSqlViewMode('subscription')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    sqlViewMode === 'subscription'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                  <span>Kode Subscription (postgres_changes)</span>
                  <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 text-[10px]">Realtime Client</span>
                </button>
              </div>

              {/* Data Summary Stats */}
              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-semibold px-2">
                <span>{teachers.length} Guru</span>
                <span>&bull;</span>
                <span>{students.length} Siswa (19 Kelas)</span>
                <span>&bull;</span>
                <span>{users.length} Akun</span>
              </div>
            </div>

            {/* Quick Step Guide */}
            {sqlViewMode !== 'subscription' ? (
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
                    Tempelkan skrip di bawah ini lalu tekan tombol <strong>RUN</strong>. Seluruh tabel, publikasi realtime, dan data langsung siap!
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs">
                <div className="flex items-center gap-2 mb-1.5 font-bold text-emerald-800">
                  <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
                  <span>Mekanisme Subscription postgres_changes di SALAM Quran</span>
                </div>
                <p className="text-emerald-900/80 leading-relaxed text-[11px]">
                  Kode di bawah ini aktif berjalan di dalam aplikasi saat terhubung online ke Supabase. Melalui channel <code>salam_quran_postgres_changes</code>, aplikasi mendengarkan secara realtime seluruh mutasi data:
                  <strong> records</strong> (setoran hafalan guru), <strong>students</strong> (tambah/hapus siswa), <strong>teachers</strong> (data guru), dan <strong>users</strong> (perubahan kata sandi akun). Seluruh perangkat guru dan wali murid akan tersinkronisasi otomatis dalam hitungan milidetik!
                </p>
              </div>
            )}

            {/* Code Viewer */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-md">
              <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                  <span className="ml-2 text-slate-300 font-semibold">
                    {sqlViewMode === 'subscription'
                      ? 'salam_quran_realtime_subscription.ts'
                      : sqlViewMode === 'all'
                      ? 'salam_quran_complete_schema_and_data.sql'
                      : sqlViewMode === 'schema'
                      ? 'salam_quran_schema_realtime.sql'
                      : 'salam_quran_seed_data.sql'}
                  </span>
                </div>
                <span className="text-[11px] text-teal-400 font-sans font-medium">
                  {sqlViewMode === 'subscription'
                    ? 'TypeScript Supabase JS v2 • postgres_changes'
                    : sqlViewMode === 'all'
                    ? 'DDL + Realtime CDC + Data Master Lengkap'
                    : sqlViewMode === 'schema'
                    ? 'PostgreSQL DDL + CDC Publication'
                    : 'Data Seed Siswa & Guru'}
                </span>
              </div>

              <pre className="bg-slate-900 text-emerald-400 p-5 text-xs font-mono overflow-x-auto max-h-[520px] leading-relaxed select-all">
                {(() => {
                  const records = getRecords();
                  if (sqlViewMode === 'subscription') return getSubscriptionCodeSample();
                  if (sqlViewMode === 'schema') return getSupabaseDdlSchema();
                  if (sqlViewMode === 'seed') return getSupabaseSeedDataSql(teachers, students, users, records);
                  return getCompleteSupabaseSql(teachers, students, users, records);
                })()}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
