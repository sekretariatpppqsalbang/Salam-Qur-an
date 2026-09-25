import React, { useState, useMemo } from 'react';
import { UserAccount, Student, HafalanRecord, LearningType, Grade } from '../types';
import { CLASS_LIST } from '../data/initialData';
import { SURAH_LIST, JUZ_LIST, TAHSIN_BOOKS, GRADE_OPTIONS } from '../data/quranData';
import {
  getStudents,
  getRecords,
  addRecord,
  deleteRecord,
  getRekapGuru,
  exportRekapToExcel,
  MONTH_NAMES_ID,
} from '../services/storageService';
import { PrintableReportModal } from './PrintableReportModal';
import confetti from 'canvas-confetti';
import {
  Calendar,
  Layers,
  User,
  BookMarked,
  Sparkles,
  CheckCircle2,
  Trash2,
  Download,
  Printer,
  Search,
  Filter,
  FileSpreadsheet,
  Award,
  Clock,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

interface GuruDashboardProps {
  currentUser: UserAccount;
}

export const GuruDashboard: React.FC<GuruDashboardProps> = ({ currentUser }) => {
  const [students, setStudents] = useState<Student[]>(() => getStudents());
  const [records, setRecords] = useState<HafalanRecord[]>(() => getRecords());

  // Input Form States
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedClass, setSelectedClass] = useState('1A');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [learningType, setLearningType] = useState<LearningType>('tahsin');

  // Tahsin fields
  const [tahsinBook, setTahsinBook] = useState(TAHSIN_BOOKS[0]);
  const [page, setPage] = useState('');

  // Tahfidz fields
  const [juz, setJuz] = useState<number>(30);
  const [surahNumber, setSurahNumber] = useState<number>(78); // An-Naba' by default
  const [ayatRange, setAyatRange] = useState('');

  // Common Evaluation fields
  const [grade, setGrade] = useState<Grade>('A (Mumtaz)');
  const [notes, setNotes] = useState('');

  // Success Feedback
  const [savedAlert, setSavedAlert] = useState<string | null>(null);

  // Rekap Bulanan Filter States
  const [rekapClass, setRekapClass] = useState('1A');
  const [rekapMonth, setRekapMonth] = useState<number>(new Date().getMonth() + 1);
  const [rekapYear, setRekapYear] = useState<number>(new Date().getFullYear());
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Preview List Filters
  const [previewTab, setPreviewTab] = useState<'today' | 'all'>('today');
  const [previewSearch, setPreviewSearch] = useState('');

  // Listen to storage events
  React.useEffect(() => {
    const handleStorageChange = () => {
      setStudents(getStudents());
      setRecords(getRecords());
    };
    window.addEventListener('salam_storage_changed', handleStorageChange);
    return () => window.removeEventListener('salam_storage_changed', handleStorageChange);
  }, []);

  // Filter students based on selected class
  const classStudents = useMemo(() => {
    return students.filter((s) => s.className === selectedClass);
  }, [students, selectedClass]);

  // When class changes, reset student selection to first student or empty
  React.useEffect(() => {
    if (classStudents.length > 0) {
      setSelectedStudentId(classStudents[0].id);
    } else {
      setSelectedStudentId('');
    }
  }, [selectedClass, classStudents]);

  // Selected Surah info
  const currentSurah = useMemo(() => {
    return SURAH_LIST.find((s) => s.number === Number(surahNumber)) || SURAH_LIST[0];
  }, [surahNumber]);

  // When surah changes, auto-adjust suggested juz if needed
  const handleSurahChange = (sNum: number) => {
    setSurahNumber(sNum);
    const surah = SURAH_LIST.find((s) => s.number === sNum);
    if (surah) {
      setJuz(surah.juz);
    }
  };

  // Handle Form Submit
  const handleSaveData = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find((s) => s.id === selectedStudentId);
    if (!student) {
      alert('Pilih siswa terlebih dahulu!');
      return;
    }

    const newRecord = addRecord({
      date: selectedDate,
      studentId: student.id,
      studentName: student.name,
      className: selectedClass,
      teacherId: currentUser.teacherId || currentUser.id,
      teacherName: currentUser.fullName,
      type: learningType,
      tahsinBook: learningType === 'tahsin' ? tahsinBook : undefined,
      page: learningType === 'tahsin' ? (page.trim() || 'Halaman 1') : undefined,
      juz: learningType === 'tahfidz' ? Number(juz) : undefined,
      surahNumber: learningType === 'tahfidz' ? currentSurah.number : undefined,
      surahName: learningType === 'tahfidz' ? currentSurah.nameLatin : undefined,
      ayatRange: learningType === 'tahfidz' ? (ayatRange.trim() || `Ayat 1 - ${Math.min(10, currentSurah.ayatCount)}`) : undefined,
      grade: grade,
      notes: notes.trim() || 'Hafalan lancar dan tartil.',
    });

    // Fire joyful confetti celebration
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#00C2A0', '#008f75', '#3F4E5A', '#FFD700'],
      });
    } catch {
      // ignore
    }

    setSavedAlert(`Berhasil menyimpan data capaian untuk ${student.name}!`);
    setTimeout(() => setSavedAlert(null), 4000);

    // Reset notes or keep values ready for next student
    setNotes('');
  };

  const handleDeleteRecord = (id: string) => {
    if (confirm('Yakin ingin menghapus catatan capaian ini?')) {
      deleteRecord(id);
    }
  };

  // Preview Records
  const previewRecords = useMemo(() => {
    return records.filter((r) => {
      if (previewTab === 'today' && r.date !== todayStr) return false;
      if (previewSearch) {
        const query = previewSearch.toLowerCase();
        return (
          r.studentName.toLowerCase().includes(query) ||
          r.className.toLowerCase().includes(query) ||
          (r.surahName && r.surahName.toLowerCase().includes(query)) ||
          (r.tahsinBook && r.tahsinBook.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [records, previewTab, todayStr, previewSearch]);

  // Rekap Bulanan Data
  const rekapSummary = useMemo(() => {
    return getRekapGuru(rekapClass, rekapMonth, rekapYear);
  }, [rekapClass, rekapMonth, rekapYear, records]);

  const handleDownloadExcel = () => {
    exportRekapToExcel(
      rekapSummary.records,
      rekapClass,
      rekapMonth,
      rekapYear,
      currentUser.fullName
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-800 to-[#3F4E5A] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-xs font-semibold text-teal-200 mb-3 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-[#00C2A0]" />
            <span>Portal Input Guru Qur'an SDIT Salsabila 3</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            Assalamu'alaikum, {currentUser.fullName}
          </h2>
          <p className="text-xs sm:text-sm text-teal-100/90 mt-2 leading-relaxed">
            Silakan catat penambahan hafalan (Tahfidz) atau perkembangan jilid bacaan (Tahsin) siswa dengan cermat dan tepat. Data tersimpan real-time untuk pemantauan wali siswa.
          </p>
        </div>
        
        {/* Decorative background Islamic circle */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-white/5 pointer-events-none blur-xl" />
      </div>

      {/* Main Grid: Input Form & Today's Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Col: Form Input Capaian (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-8">
          <div className="flex items-center justify-between pb-5 border-b border-slate-100 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#00C2A0] flex items-center justify-center">
                <BookMarked className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#3F4E5A]">
                  Form Input Capaian Qur'an
                </h3>
                <p className="text-xs text-slate-500">Pilih materi Tahsin atau Tahfidz</p>
              </div>
            </div>

            {/* Toggle Tahsin vs Tahfidz */}
            <div className="p-1 bg-slate-100 rounded-xl flex gap-1">
              <button
                type="button"
                onClick={() => setLearningType('tahsin')}
                className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  learningType === 'tahsin'
                    ? 'bg-white text-[#008f75] shadow-xs'
                    : 'text-slate-500 hover:text-[#3F4E5A]'
                }`}
              >
                Tahsin
              </button>
              <button
                type="button"
                onClick={() => setLearningType('tahfidz')}
                className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  learningType === 'tahfidz'
                    ? 'bg-white text-[#008f75] shadow-xs'
                    : 'text-slate-500 hover:text-[#3F4E5A]'
                }`}
              >
                Tahfidz
              </button>
            </div>
          </div>

          {savedAlert && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-xs font-bold animate-in fade-in duration-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{savedAlert}</span>
            </div>
          )}

          <form onSubmit={handleSaveData} className="space-y-6">
            
            {/* Row 1: Tanggal & Kelas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#3F4E5A] mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#00C2A0]" />
                  <span>Tanggal Setoran</span>
                </label>
                <input
                  type="date"
                  required
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:border-[#00C2A0] focus:ring-2 focus:ring-[#00C2A0]/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3F4E5A] mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#00C2A0]" />
                  <span>Pilihan Kelas (1A - 6C)</span>
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-[#3F4E5A] bg-white focus:border-[#00C2A0] focus:ring-2 focus:ring-[#00C2A0]/20 outline-none cursor-pointer"
                >
                  {CLASS_LIST.map((cls) => (
                    <option key={cls} value={cls}>
                      Kelas {cls}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Data Peserta Didik (Without NIS) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#3F4E5A] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#00C2A0]" />
                  <span>Nama Peserta Didik ({classStudents.length} Siswa di Kelas {selectedClass})</span>
                </label>
                <span className="text-[11px] text-slate-400 font-medium">Tanpa menggunakan NIS</span>
              </div>
              <select
                required
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-[#3F4E5A] bg-white focus:border-[#00C2A0] focus:ring-2 focus:ring-[#00C2A0]/20 outline-none cursor-pointer"
              >
                {classStudents.length === 0 ? (
                  <option value="">Tidak ada siswa di kelas ini</option>
                ) : (
                  classStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* SPECIFIC FIELDS: TAHSIN VS TAHFIDZ */}
            {learningType === 'tahsin' ? (
              <div className="p-5 rounded-2xl bg-amber-50/40 border border-amber-200/60 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <BookMarked className="w-4 h-4 text-amber-600" />
                  <span>Materi Pembelajaran Tahsin</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Pilihan Buku
                    </label>
                    <select
                      value={tahsinBook}
                      onChange={(e) => setTahsinBook(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold focus:border-[#00C2A0] outline-none cursor-pointer"
                    >
                      {TAHSIN_BOOKS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Halaman / Materi
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Halaman 15 atau Juz 1 Hal 2"
                      value={page}
                      onChange={(e) => setPage(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:border-[#00C2A0] outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-teal-50/50 border border-teal-200/70 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-teal-900">
                  <BookMarked className="w-4 h-4 text-[#00C2A0]" />
                  <span>Materi Setoran Tahfidz (Al-Qur'an 30 Juz)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Pilihan Juz (1 - 30)
                    </label>
                    <select
                      value={juz}
                      onChange={(e) => setJuz(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold focus:border-[#00C2A0] outline-none cursor-pointer"
                    >
                      {JUZ_LIST.map((j) => (
                        <option key={j.number} value={j.number}>
                          {j.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Pilihan 114 Surat Lengkap
                    </label>
                    <select
                      value={surahNumber}
                      onChange={(e) => handleSurahChange(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold focus:border-[#00C2A0] outline-none cursor-pointer"
                    >
                      {SURAH_LIST.map((s) => (
                        <option key={s.number} value={s.number}>
                          {s.number}. {s.nameLatin} ({s.nameArabic}) - {s.ayatCount} Ayat
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Rentang Ayat yang Disetorkan
                    </label>
                    <span className="text-[11px] text-[#008f75] font-semibold">
                      Total ayat surat {currentSurah.nameLatin}: {currentSurah.ayatCount} ayat
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder={`Contoh: Ayat 1 - ${Math.min(15, currentSurah.ayatCount)}`}
                    value={ayatRange}
                    onChange={(e) => setAyatRange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:border-[#00C2A0] outline-none"
                  />
                </div>
              </div>
            )}

            {/* Evaluation: Penilaian & Catatan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#3F4E5A] mb-1.5 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-[#00C2A0]" />
                  <span>Kolom Penilaian (Predikat)</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {GRADE_OPTIONS.map((opt) => (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => setGrade(opt.value as Grade)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer ${
                        grade === opt.value
                          ? `${opt.color} border-transparent shadow-sm ring-2 ring-offset-1 ring-[#00C2A0]/40`
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {opt.value}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3F4E5A] mb-1.5 flex items-center justify-between">
                  <span>Nama Guru Penginput</span>
                  <span className="text-[11px] text-slate-400 font-normal">Otomatis Terverifikasi</span>
                </label>
                <input
                  type="text"
                  disabled
                  value={currentUser.fullName}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Kolom Keterangan: Catatan Guru */}
            <div>
              <label className="block text-xs font-bold text-[#3F4E5A] mb-1.5">
                Kolom Keterangan: Catatan Evaluasi Guru
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan fashahah, makharijul huruf, kelancaran tajwid, atau ayat yang perlu dimuraja'ah..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:border-[#00C2A0] focus:ring-2 focus:ring-[#00C2A0]/20 outline-none"
              />
            </div>

            {/* Tombol Simpan Data */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#00C2A0] to-[#009b80] text-white text-sm font-bold shadow-lg shadow-[#00C2A0]/30 hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Simpan Data Capaian Qur'an</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Col: Quick Stats & Input Hari Ini (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Quick Metrics Card */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center justify-between">
              <span>Aktivitas Hari Ini ({todayStr})</span>
              <Clock className="w-4 h-4 text-[#00C2A0]" />
            </h4>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-100">
                <span className="text-[11px] font-semibold text-slate-500">Total Input</span>
                <p className="text-2xl font-black text-[#008f75]">
                  {records.filter((r) => r.date === todayStr).length}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                <span className="text-[11px] font-semibold text-slate-500">Mumtaz (A)</span>
                <p className="text-2xl font-black text-emerald-700">
                  {records.filter((r) => r.date === todayStr && r.grade.includes('Mumtaz')).length}
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
              💡 Guru Qur'an SDIT Salsabila 3 dapat melakukan input beruntun untuk seluruh siswa kelas dengan cepat.
            </div>
          </div>

          {/* Quick Info Guru */}
          <div className="bg-gradient-to-br from-slate-50 to-teal-50/40 rounded-3xl p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#00C2A0] text-white flex items-center justify-center font-bold text-sm">
                {currentUser.fullName.charAt(0)}
              </div>
              <div>
                <p className="text-xs font-bold text-[#3F4E5A]">{currentUser.fullName}</p>
                <p className="text-[11px] text-[#008f75] font-semibold">Guru Pengampu</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Seluruh data input tercatat dengan nama lengkap Anda dan langsung muncul di dashboard wali siswa.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION: PREVIEW HASIL SIMPAN DATA HARI INI DAN SEBELUMNYA */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#3F4E5A]">
              Preview Hasil Simpan Hari Ini & Inputan Sebelumnya
            </h3>
            <p className="text-xs text-slate-500">
              Daftar rekam log setoran siswa yang telah tersimpan di sistem
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="p-1 bg-slate-100 rounded-xl flex gap-1">
              <button
                type="button"
                onClick={() => setPreviewTab('today')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  previewTab === 'today' ? 'bg-white text-[#008f75] shadow-xs' : 'text-slate-500'
                }`}
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  previewTab === 'all' ? 'bg-white text-[#008f75] shadow-xs' : 'text-slate-500'
                }`}
              >
                Semua Riwayat
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama siswa / surah..."
                value={previewSearch}
                onChange={(e) => setPreviewSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:border-[#00C2A0] outline-none"
              />
            </div>
          </div>
        </div>

        {/* Table List */}
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <th className="py-3 px-3">Tanggal</th>
                <th className="py-3 px-3">Nama Siswa</th>
                <th className="py-3 px-3 text-center">Kelas</th>
                <th className="py-3 px-3">Pelajaran</th>
                <th className="py-3 px-3">Materi / Surah</th>
                <th className="py-3 px-3">Hal / Ayat</th>
                <th className="py-3 px-3 text-center">Nilai</th>
                <th className="py-3 px-3">Catatan Guru</th>
                <th className="py-3 px-3">Penginput</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {previewRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Belum ada data input pada filter ini.
                  </td>
                </tr>
              ) : (
                previewRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">{r.date}</td>
                    <td className="py-3 px-3 font-bold text-[#3F4E5A]">{r.studentName}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 font-bold text-slate-700">
                        {r.className}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          r.type === 'tahsin' ? 'bg-amber-100 text-amber-900' : 'bg-teal-100 text-teal-900'
                        }`}
                      >
                        {r.type === 'tahsin' ? 'Tahsin' : 'Tahfidz'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {r.type === 'tahsin' ? r.tahsinBook : `Surah ${r.surahName} (Juz ${r.juz || '-'})`}
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium">
                      {r.type === 'tahsin' ? r.page : r.ayatRange}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          r.grade.includes('Mumtaz')
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.grade.includes('Jayyid Jiddan')
                            ? 'bg-teal-100 text-teal-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {r.grade}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 max-w-xs truncate" title={r.notes}>
                      {r.notes || '-'}
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium whitespace-nowrap">
                      {r.teacherName}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleDeleteRecord(r.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Catatan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* KARTU ANTARMUKA: UNDUH REKAP BULANAN SISWA (GURU) */}
      <div className="bg-gradient-to-br from-slate-900 via-[#3F4E5A] to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00C2A0]/20 text-[#00C2A0] text-xs font-bold mb-2">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Fitur Laporan & Rekapitulasi</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight">
              UNDUH REKAP BULANAN SISWA (GURU)
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Rekapitulasi perkembangan hafalan dan bacaan siswa per kelas, bulan, dan tahun ke format Microsoft Excel (.xlsx) atau dokumen cetak resmi PDF.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleDownloadExcel}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#00C2A0] text-white text-xs font-bold shadow-lg shadow-[#00C2A0]/30 hover:bg-[#00a88b] transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Rekap Excel (.xlsx)</span>
            </button>

            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 backdrop-blur-xs transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>
          </div>
        </div>

        {/* Filter Fleksibel: Kombinasi Kelas, Bulan, Tahun */}
        <div className="mt-6 pt-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Filter Fleksibel Perkembangan Siswa:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Kombinasi Kelas
              </label>
              <select
                value={rekapClass}
                onChange={(e) => setRekapClass(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs font-bold text-white focus:border-[#00C2A0] outline-none cursor-pointer"
              >
                <option value="Semua">Seluruh Kelas (1A - 6C)</option>
                {CLASS_LIST.map((cls) => (
                  <option key={cls} value={cls}>
                    Kelas {cls}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Pilihan Bulan
              </label>
              <select
                value={rekapMonth}
                onChange={(e) => setRekapMonth(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs font-bold text-white focus:border-[#00C2A0] outline-none cursor-pointer"
              >
                {MONTH_NAMES_ID.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Tahun Ajaran / Kalender
              </label>
              <select
                value={rekapYear}
                onChange={(e) => setRekapYear(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs font-bold text-white focus:border-[#00C2A0] outline-none cursor-pointer"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    Tahun {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Live Summary Chips of the Filtered Rekap */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
            <span className="text-[11px] text-slate-400">Total Setoran</span>
            <p className="text-xl font-black text-white">{rekapSummary.totalRecords}</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
            <span className="text-[11px] text-slate-400">Siswa Terekam</span>
            <p className="text-xl font-black text-teal-300">{rekapSummary.totalStudentsRecorded}</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
            <span className="text-[11px] text-slate-400">Tahsin</span>
            <p className="text-xl font-black text-amber-300">{rekapSummary.tahsinCount}</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
            <span className="text-[11px] text-slate-400">Tahfidz</span>
            <p className="text-xl font-black text-emerald-300">{rekapSummary.tahfidzCount}</p>
          </div>
        </div>
      </div>

      {/* Printable / PDF Modal */}
      <PrintableReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title={`REKAPITULASI CAPAIAN BULANAN AL-QUR'AN`}
        periodLabel={`Kelas: ${rekapClass === 'Semua' ? 'Seluruh Kelas' : rekapClass} | Periode: ${MONTH_NAMES_ID[rekapMonth - 1]} ${rekapYear}`}
        records={rekapSummary.records}
        teacherName={currentUser.fullName}
      />
    </div>
  );
};
