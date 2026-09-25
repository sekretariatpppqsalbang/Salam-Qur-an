import React from 'react';
import { HafalanRecord } from '../types';
import { Printer, X, Download, BookOpen, Award, CheckCircle } from 'lucide-react';
import { MONTH_NAMES_ID } from '../services/storageService';

interface PrintableReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  records: HafalanRecord[];
  studentName?: string;
  className?: string;
  teacherName?: string;
  periodLabel?: string;
}

export const PrintableReportModal: React.FC<PrintableReportModalProps> = ({
  isOpen,
  onClose,
  title,
  records,
  studentName,
  className,
  teacherName,
  periodLabel,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const currentDateFormatted = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-auto flex flex-col max-h-[95vh] overflow-hidden">
        
        {/* Modal Toolbar (hidden when printing) */}
        <div className="no-print px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#3F4E5A]">{title}</h3>
            <p className="text-xs text-slate-500">Pratinjau cetak resmi SDIT Salsabila 3 Banguntapan (Siap Cetak / Simpan PDF)</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00C2A0] text-white text-xs font-bold shadow-md shadow-[#00C2A0]/25 hover:opacity-95 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Paper */}
        <div className="p-6 sm:p-10 overflow-y-auto bg-white text-[#3F4E5A]">
          
          {/* School Letterhead / KOP SURAT */}
          <div className="border-b-2 border-slate-800 pb-4 mb-6 text-center">
            <div className="flex items-center justify-center gap-4 mb-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00C2A0] to-[#008f75] flex items-center justify-center text-white font-bold shadow-md">
                <BookOpen className="w-7 h-7" />
              </div>
              <div className="text-center">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-[#3F4E5A] uppercase">
                  SD ISLAM TERPADU SALSABILA 3 BANGUNTAPAN
                </h1>
                <p className="text-xs sm:text-sm font-bold text-[#008f75]">
                  PROGRAM TAHFIDZ & TAHSIN AL-QUR'AN (SALAM QURAN)
                </p>
                <p className="text-[11px] text-slate-500">
                  Alamat: Banguntapan, Bantul, D.I. Yogyakarta | Telp / WA: 0812-XXXX-XXXX
                </p>
              </div>
            </div>
          </div>

          {/* Title of Document */}
          <div className="text-center mb-6">
            <h2 className="text-sm sm:text-base font-black tracking-wide uppercase text-slate-900 underline underline-offset-4">
              {title}
            </h2>
            {periodLabel && (
              <p className="text-xs font-semibold text-slate-600 mt-1">
                {periodLabel}
              </p>
            )}
          </div>

          {/* Meta Info (if student specific) */}
          {studentName && (
            <div className="grid grid-cols-2 gap-3 mb-6 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500">Nama Siswa:</span>
                <p className="font-bold text-slate-900 text-sm">{studentName}</p>
              </div>
              <div>
                <span className="text-slate-500">Kelas:</span>
                <p className="font-bold text-slate-900 text-sm">{className || '-'}</p>
              </div>
              {teacherName && (
                <div className="col-span-2">
                  <span className="text-slate-500">Guru Qur'an Pembimbing:</span>
                  <p className="font-semibold text-slate-800">{teacherName}</p>
                </div>
              )}
            </div>
          )}

          {/* Table of Records */}
          <div className="overflow-x-auto mb-8">
            <table className="w-full text-xs text-left border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-800 border-b border-slate-300">
                  <th className="py-2.5 px-3 border border-slate-300 text-center w-10">No</th>
                  <th className="py-2.5 px-3 border border-slate-300 w-24">Tanggal</th>
                  {!studentName && <th className="py-2.5 px-3 border border-slate-300">Nama Siswa</th>}
                  {!className && <th className="py-2.5 px-3 border border-slate-300 text-center w-14">Kelas</th>}
                  <th className="py-2.5 px-3 border border-slate-300 w-20">Program</th>
                  <th className="py-2.5 px-3 border border-slate-300">Materi / Surah / Buku</th>
                  <th className="py-2.5 px-3 border border-slate-300 w-28">Hal / Ayat</th>
                  <th className="py-2.5 px-3 border border-slate-300 text-center w-24">Predikat</th>
                  <th className="py-2.5 px-3 border border-slate-300">Catatan Guru</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={studentName ? 7 : 9} className="py-8 text-center text-slate-400 italic">
                      Tidak ada catatan setoran pada periode ini.
                    </td>
                  </tr>
                ) : (
                  records.map((r, i) => (
                    <tr key={r.id || i} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="py-2 px-3 border border-slate-300 text-center">{i + 1}</td>
                      <td className="py-2 px-3 border border-slate-300 whitespace-nowrap">{r.date}</td>
                      {!studentName && (
                        <td className="py-2 px-3 border border-slate-300 font-semibold text-slate-900">
                          {r.studentName}
                        </td>
                      )}
                      {!className && (
                        <td className="py-2 px-3 border border-slate-300 text-center font-bold">
                          {r.className}
                        </td>
                      )}
                      <td className="py-2 px-3 border border-slate-300 font-medium">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          r.type === 'tahsin' ? 'bg-amber-100 text-amber-900' : 'bg-teal-100 text-teal-900'
                        }`}>
                          {r.type === 'tahsin' ? 'Tahsin' : 'Tahfidz'}
                        </span>
                      </td>
                      <td className="py-2 px-3 border border-slate-300 font-medium text-slate-900">
                        {r.type === 'tahsin' ? r.tahsinBook : `Surah ${r.surahName} (Juz ${r.juz || '-'})`}
                      </td>
                      <td className="py-2 px-3 border border-slate-300 text-slate-700">
                        {r.type === 'tahsin' ? r.page : r.ayatRange}
                      </td>
                      <td className="py-2 px-3 border border-slate-300 text-center font-bold">
                        <span className={`px-1.5 py-0.5 rounded ${
                          r.grade.includes('Mumtaz') ? 'text-emerald-700 bg-emerald-50' :
                          r.grade.includes('Jayyid Jiddan') ? 'text-teal-700 bg-teal-50' : 'text-amber-700 bg-amber-50'
                        }`}>
                          {r.grade}
                        </span>
                      </td>
                      <td className="py-2 px-3 border border-slate-300 text-slate-600 italic">
                        {r.notes || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Signature Section */}
          <div className="grid grid-cols-2 gap-8 text-xs pt-4 border-t border-slate-200">
            <div className="text-center">
              <p className="text-slate-500">Mengetahui,</p>
              <p className="font-bold text-slate-800">Koordinator Qur'an SDIT Salsabila 3</p>
              <div className="h-16 flex items-center justify-center">
                {/* Space for stamp/signature */}
              </div>
              <p className="font-bold text-slate-900 underline underline-offset-2">
                Amannasrullah Amin, S.Pd. M.Pd.
              </p>
              <p className="text-[11px] text-slate-500">NIP. SDIT-SALSABILA-01</p>
            </div>

            <div className="text-center">
              <p className="text-slate-500">Banguntapan, {currentDateFormatted}</p>
              <p className="font-bold text-slate-800">Guru Qur'an Pembimbing</p>
              <div className="h-16 flex items-center justify-center">
                {/* Space for stamp/signature */}
              </div>
              <p className="font-bold text-slate-900 underline underline-offset-2">
                {teacherName || 'Guru Pengampu Qur\'an'}
              </p>
              <p className="text-[11px] text-slate-500">SDIT Salsabila 3 Banguntapan</p>
            </div>
          </div>
        </div>

        {/* Modal Footer (hidden when printing) */}
        <div className="no-print px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-xs font-semibold text-slate-700 transition-colors"
          >
            Tutup
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00C2A0] text-white text-xs font-bold shadow-md shadow-[#00C2A0]/25 hover:opacity-95 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Dokumen</span>
          </button>
        </div>
      </div>
    </div>
  );
};
