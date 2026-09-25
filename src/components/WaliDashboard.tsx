import React, { useState, useMemo } from 'react';
import { UserAccount, Student, HafalanRecord } from '../types';
import { getStudents, getRecords } from '../services/storageService';
import { PrintableReportModal } from './PrintableReportModal';
import {
  UserCheck,
  BookOpen,
  Sparkles,
  Calendar,
  Award,
  Download,
  Printer,
  ChevronRight,
  TrendingUp,
  Clock,
  BookMarked,
  Filter,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

interface WaliDashboardProps {
  currentUser: UserAccount;
}

export const WaliDashboard: React.FC<WaliDashboardProps> = ({ currentUser }) => {
  const [students] = useState<Student[]>(() => getStudents());
  const [records, setRecords] = useState<HafalanRecord[]>(() => getRecords());

  // Filters
  const [filterType, setFilterType] = useState<'all' | 'tahsin' | 'tahfidz'>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Listen to storage events for real-time updates!
  React.useEffect(() => {
    const handleStorageChange = () => {
      setRecords(getRecords());
    };
    window.addEventListener('salam_storage_changed', handleStorageChange);
    return () => window.removeEventListener('salam_storage_changed', handleStorageChange);
  }, []);

  // Find corresponding student for this wali
  const child = useMemo(() => {
    if (currentUser.studentId) {
      return students.find((s) => s.id === currentUser.studentId);
    }
    // Fallback: match by wali username
    return (
      students.find((s) => s.waliUsername === currentUser.username) ||
      students.find((s) => s.name.toLowerCase().includes(currentUser.fullName.toLowerCase())) ||
      students[0]
    );
  }, [currentUser, students]);

  // Child's records sorted by date descending
  const childRecords = useMemo(() => {
    if (!child) return [];
    return records
      .filter((r) => r.studentId === child.id || r.studentName.toLowerCase() === child.name.toLowerCase())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, child]);

  // Filtered records for table
  const filteredRecords = useMemo(() => {
    return childRecords.filter((r) => {
      if (filterType !== 'all' && r.type !== filterType) return false;
      if (filterMonth !== 'all') {
        const recordMonth = r.date.split('-')[1];
        if (recordMonth !== filterMonth) return false;
      }
      return true;
    });
  }, [childRecords, filterType, filterMonth]);

  // Last Tahsin record
  const lastTahsin = useMemo(() => {
    return childRecords.find((r) => r.type === 'tahsin');
  }, [childRecords]);

  // Last Tahfidz record
  const lastTahfidz = useMemo(() => {
    return childRecords.find((r) => r.type === 'tahfidz');
  }, [childRecords]);

  // Grade Counts
  const gradeStats = useMemo(() => {
    const mumtaz = childRecords.filter((r) => r.grade.includes('Mumtaz')).length;
    const jayyidJiddan = childRecords.filter((r) => r.grade.includes('Jayyid Jiddan')).length;
    const jayyid = childRecords.filter((r) => r.grade === 'B (Jayyid)').length;
    return { mumtaz, jayyidJiddan, jayyid };
  }, [childRecords]);

  if (!child) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center text-slate-500">
        Data siswa tidak ditemukan. Harap hubungi administrator sekolah.
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Child Profile & School Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-[#3F4E5A] to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-2xl font-black text-[#00C2A0] border border-white/20 shadow-md">
              {child.name.charAt(0)}
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00C2A0]/20 text-teal-200 text-xs font-bold mb-1.5 border border-white/10">
                <Sparkles className="w-3.5 h-3.5 text-[#00C2A0]" />
                <span>Portal Pemantauan Capaian Qur'an Siswa</span>
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight">
                {child.name}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-teal-100">
                <span className="font-bold bg-white/15 px-2.5 py-0.5 rounded-lg border border-white/15">
                  Kelas {child.className}
                </span>
                <span>&bull;</span>
                <span>SD Islam Terpadu Salsabila 3 Banguntapan</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#00C2A0] text-white text-xs font-bold shadow-lg shadow-[#00C2A0]/30 hover:bg-[#00a88b] transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Unduh Rapor Ringkas Capaian (PDF)</span>
            </button>
          </div>
        </div>

        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-white/5 pointer-events-none blur-2xl" />
      </div>

      {/* HIGHLIGHT: NAMA GURU LENGKAP PENGINPUT (Explicit prompt requirement) */}
      {childRecords.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-teal-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#00C2A0] flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5 text-[#008f75]" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Guru Qur'an Penginput Terakhir:</p>
              <p className="text-sm font-bold text-[#3F4E5A]">
                {childRecords[0].teacherName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-[#00C2A0]" />
            <span>Terakhir Diperbarui: {childRecords[0].date}</span>
          </div>
        </div>
      )}

      {/* Capaian Terakhir Cards (Tahsin & Tahfidz) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Capaian Tahsin Terakhir */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
                Perkembangan Tahsin
              </span>
              <BookOpen className="w-5 h-5 text-amber-500" />
            </div>

            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Buku & Halaman Terakhir
            </p>
            <h3 className="text-xl font-black text-[#3F4E5A] mt-1">
              {lastTahsin ? lastTahsin.tahsinBook : "Yanfa'una Jilid 1"}
            </h3>
            <p className="text-sm font-bold text-amber-700 mt-0.5">
              {lastTahsin ? lastTahsin.page : 'Belum ada catatan'}
            </p>

            {lastTahsin && (
              <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-500">Predikat:</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {lastTahsin.grade}
                  </span>
                </div>
                <p className="text-slate-600 italic mt-1.5 line-clamp-2">
                  "{lastTahsin.notes || 'Hafalan lancar dan tartil'}"
                </p>
                <div className="mt-2 pt-2 border-t border-slate-200/80 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Guru: <strong>{lastTahsin.teacherName}</strong></span>
                  <span>{lastTahsin.date}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Capaian Tahfidz Terakhir */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-900 border border-teal-200">
                Perkembangan Tahfidz
              </span>
              <Sparkles className="w-5 h-5 text-[#00C2A0]" />
            </div>

            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Surat & Rentang Ayat Terakhir
            </p>
            <h3 className="text-xl font-black text-[#3F4E5A] mt-1">
              {lastTahfidz ? `Surah ${lastTahfidz.surahName}` : "Surah An-Naba'"}
            </h3>
            <p className="text-sm font-bold text-[#008f75] mt-0.5">
              {lastTahfidz ? `${lastTahfidz.ayatRange} (Juz ${lastTahfidz.juz})` : 'Belum ada catatan'}
            </p>

            {lastTahfidz && (
              <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-500">Predikat:</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {lastTahfidz.grade}
                  </span>
                </div>
                <p className="text-slate-600 italic mt-1.5 line-clamp-2">
                  "{lastTahfidz.notes || 'Hafalan sangat mutqin dan lancar.'}"
                </p>
                <div className="mt-2 pt-2 border-t border-slate-200/80 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Guru: <strong>{lastTahfidz.teacherName}</strong></span>
                  <span>{lastTahfidz.date}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Visual Statistics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-center">
          <p className="text-xs font-semibold text-slate-400">Total Setoran</p>
          <p className="text-3xl font-black text-[#3F4E5A] mt-1">{childRecords.length}</p>
          <span className="text-[11px] text-teal-600 font-medium">Kali setoran</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-center">
          <p className="text-xs font-semibold text-slate-400">Mumtaz (A)</p>
          <p className="text-3xl font-black text-emerald-600 mt-1">{gradeStats.mumtaz}</p>
          <span className="text-[11px] text-emerald-700 font-medium">Sempurna</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-center">
          <p className="text-xs font-semibold text-slate-400">Jayyid Jiddan (A-)</p>
          <p className="text-3xl font-black text-teal-600 mt-1">{gradeStats.jayyidJiddan}</p>
          <span className="text-[11px] text-teal-700 font-medium">Sangat Baik</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-center">
          <p className="text-xs font-semibold text-slate-400">Jayyid (B)</p>
          <p className="text-3xl font-black text-amber-600 mt-1">{gradeStats.jayyid}</p>
          <span className="text-[11px] text-amber-700 font-medium">Cukup Baik</span>
        </div>
      </div>

      {/* Detailed Timeline Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#3F4E5A]">
              Riwayat Lengkap Setoran Qur'an Ananda
            </h3>
            <p className="text-xs text-slate-500">
              Menampilkan seluruh riwayat tahsin & tahfidz dengan nama lengkap guru penginput
            </p>
          </div>

          {/* Filter options */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="p-1 bg-slate-100 rounded-xl flex gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterType === 'all' ? 'bg-white text-[#008f75] shadow-xs' : 'text-slate-500'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setFilterType('tahsin')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterType === 'tahsin' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-500'
                }`}
              >
                Tahsin
              </button>
              <button
                type="button"
                onClick={() => setFilterType('tahfidz')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterType === 'tahfidz' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-500'
                }`}
              >
                Tahfidz
              </button>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <th className="py-3 px-3">Tanggal</th>
                <th className="py-3 px-3">Pelajaran</th>
                <th className="py-3 px-3">Materi / Surah</th>
                <th className="py-3 px-3">Halaman / Ayat</th>
                <th className="py-3 px-3 text-center">Nilai</th>
                <th className="py-3 px-3">Catatan Pembimbing</th>
                <th className="py-3 px-3">Guru Qur'an Penginput</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Belum ada catatan setoran pada filter ini.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3 font-mono text-slate-500 whitespace-nowrap">{r.date}</td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          r.type === 'tahsin' ? 'bg-amber-100 text-amber-900' : 'bg-teal-100 text-teal-900'
                        }`}
                      >
                        {r.type === 'tahsin' ? 'Tahsin' : 'Tahfidz'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-bold text-[#3F4E5A]">
                      {r.type === 'tahsin' ? r.tahsinBook : `Surah ${r.surahName} (Juz ${r.juz || '-'})`}
                    </td>
                    <td className="py-3.5 px-3 font-medium text-slate-700">
                      {r.type === 'tahsin' ? r.page : r.ayatRange}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
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
                    <td className="py-3.5 px-3 text-slate-600 italic max-w-sm">
                      {r.notes || '-'}
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                      {r.teacherName}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Report Modal */}
      <PrintableReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="LAPORAN CAPAIAN HASIL BELAJAR AL-QUR'AN"
        periodLabel="Tahun Ajaran 2025/2026 - SDIT Salsabila 3 Banguntapan"
        records={childRecords}
        studentName={child.name}
        className={child.className}
        teacherName={childRecords.length > 0 ? childRecords[0].teacherName : undefined}
      />
    </div>
  );
};
