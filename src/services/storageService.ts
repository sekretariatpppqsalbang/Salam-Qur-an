import { Teacher, Student, HafalanRecord, UserAccount, Role } from '../types';
import { INITIAL_TEACHERS, INITIAL_STUDENTS, INITIAL_RECORDS } from '../data/initialData';
import { pushRecordToSupabase, getSupabaseClient } from './supabaseService';
import * as XLSX from 'xlsx';

const KEY_TEACHERS = 'salam_quran_teachers_v1';
const KEY_STUDENTS = 'salam_quran_students_v1';
const KEY_RECORDS = 'salam_quran_records_prod_v2';
const KEY_USERS = 'salam_quran_users_v1';
const KEY_SESSION = 'salam_quran_session_v1';

export const DEFAULT_PASSWORD = 'salsabila3';

// Initialize storage if empty
export function initStorage(): void {
  // Purge old simulation records key if present
  if (localStorage.getItem('salam_quran_records_v1')) {
    localStorage.removeItem('salam_quran_records_v1');
  }

  if (!localStorage.getItem(KEY_TEACHERS)) {
    localStorage.setItem(KEY_TEACHERS, JSON.stringify(INITIAL_TEACHERS));
  }
  if (!localStorage.getItem(KEY_STUDENTS)) {
    localStorage.setItem(KEY_STUDENTS, JSON.stringify(INITIAL_STUDENTS));
  }
  if (!localStorage.getItem(KEY_RECORDS)) {
    localStorage.setItem(KEY_RECORDS, JSON.stringify([]));
  }

  if (!localStorage.getItem(KEY_USERS)) {
    // Generate default user accounts
    const users: UserAccount[] = [
      {
        id: 'user_admin',
        username: 'admin',
        fullName: 'Administrator Sekolah',
        role: 'admin',
        password: DEFAULT_PASSWORD,
        isDefaultPassword: true,
      }
    ];

    // Add teacher accounts
    for (const t of INITIAL_TEACHERS) {
      users.push({
        id: `u_${t.id}`,
        username: t.username,
        fullName: t.name,
        role: 'guru',
        password: DEFAULT_PASSWORD,
        isDefaultPassword: true,
        teacherId: t.id
      });
    }

    // Add wali accounts
    for (const s of INITIAL_STUDENTS) {
      users.push({
        id: `u_${s.id}`,
        username: s.waliUsername,
        fullName: `Wali dari ${s.name}`,
        role: 'wali',
        password: DEFAULT_PASSWORD,
        isDefaultPassword: true,
        studentId: s.id,
        className: s.className
      });
    }

    localStorage.setItem(KEY_USERS, JSON.stringify(users));
  }
}

// ----------------------------------------------------
// Teachers CRUD
// ----------------------------------------------------
export function getTeachers(): Teacher[] {
  initStorage();
  try {
    const data = localStorage.getItem(KEY_TEACHERS);
    return data ? JSON.parse(data) : INITIAL_TEACHERS;
  } catch {
    return INITIAL_TEACHERS;
  }
}

export function saveTeachers(teachers: Teacher[]): void {
  localStorage.setItem(KEY_TEACHERS, JSON.stringify(teachers));
  window.dispatchEvent(new Event('salam_storage_changed'));
}

export function addTeacher(name: string, title = 'Guru Qur\'an'): Teacher {
  const teachers = getTeachers();
  const cleanUsername = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '.')
    .replace(/\.+/g, '.')
    .slice(0, 20);

  const newTeacher: Teacher = {
    id: `t_${Date.now()}`,
    name,
    title,
    username: cleanUsername
  };

  teachers.push(newTeacher);
  saveTeachers(teachers);

  // create user account
  const users = getUserAccounts();
  users.push({
    id: `u_${newTeacher.id}`,
    username: newTeacher.username,
    fullName: newTeacher.name,
    role: 'guru',
    password: DEFAULT_PASSWORD,
    isDefaultPassword: true,
    teacherId: newTeacher.id
  });
  saveUserAccounts(users);

  return newTeacher;
}

export function deleteTeacher(teacherId: string): void {
  const teachers = getTeachers().filter(t => t.id !== teacherId);
  saveTeachers(teachers);

  const users = getUserAccounts().filter(u => u.teacherId !== teacherId);
  saveUserAccounts(users);
}

// ----------------------------------------------------
// Students CRUD
// ----------------------------------------------------
export function getStudents(): Student[] {
  initStorage();
  try {
    const data = localStorage.getItem(KEY_STUDENTS);
    return data ? JSON.parse(data) : INITIAL_STUDENTS;
  } catch {
    return INITIAL_STUDENTS;
  }
}

export function saveStudents(students: Student[]): void {
  localStorage.setItem(KEY_STUDENTS, JSON.stringify(students));
  window.dispatchEvent(new Event('salam_storage_changed'));
}

export function addStudent(name: string, className: string): Student {
  const students = getStudents();
  const cleanName = name
    .toLowerCase()
    .replace(/['"]/g, '')
    .trim()
    .replace(/\s+/g, '.');

  const waliUsername = `wali.${className}.${cleanName}`;
  const newStudent: Student = {
    id: `s_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name: name.toUpperCase().trim(),
    className: className.trim(),
    waliUsername: waliUsername
  };

  students.push(newStudent);
  saveStudents(students);

  // create user account for wali
  const users = getUserAccounts();
  users.push({
    id: `u_${newStudent.id}`,
    username: newStudent.waliUsername,
    fullName: `Wali dari ${newStudent.name}`,
    role: 'wali',
    password: DEFAULT_PASSWORD,
    isDefaultPassword: true,
    studentId: newStudent.id,
    className: newStudent.className
  });
  saveUserAccounts(users);

  return newStudent;
}

export function deleteStudent(studentId: string): void {
  const students = getStudents().filter(s => s.id !== studentId);
  saveStudents(students);

  const users = getUserAccounts().filter(u => u.studentId !== studentId);
  saveUserAccounts(users);

  // remove corresponding records
  const records = getRecords().filter(r => r.studentId !== studentId);
  saveRecords(records);
}

// ----------------------------------------------------
// Records (Hafalan / Capaian) CRUD
// ----------------------------------------------------
export function getRecords(): HafalanRecord[] {
  initStorage();
  try {
    const data = localStorage.getItem(KEY_RECORDS);
    return data ? JSON.parse(data) : INITIAL_RECORDS;
  } catch {
    return INITIAL_RECORDS;
  }
}

export function saveRecords(records: HafalanRecord[]): void {
  localStorage.setItem(KEY_RECORDS, JSON.stringify(records));
  window.dispatchEvent(new Event('salam_storage_changed'));
}

export function addRecord(record: Omit<HafalanRecord, 'id' | 'createdAt'>): HafalanRecord {
  const records = getRecords();
  const newRecord: HafalanRecord = {
    ...record,
    id: `rec_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    createdAt: new Date().toISOString()
  };

  records.unshift(newRecord); // newest first
  saveRecords(records);

  // Sync to Supabase in background if online/configured
  pushRecordToSupabase(newRecord).catch((err) => {
    console.debug('Offline or Supabase sync delayed:', err);
  });

  return newRecord;
}

export function updateRecord(id: string, updatedFields: Partial<HafalanRecord>): HafalanRecord | null {
  const records = getRecords();
  const index = records.findIndex(r => r.id === id);
  if (index === -1) return null;

  records[index] = { ...records[index], ...updatedFields };
  saveRecords(records);

  // Sync updated record to Supabase
  pushRecordToSupabase(records[index]).catch((err) => {
    console.debug('Offline or Supabase sync delayed:', err);
  });

  return records[index];
}

export function deleteRecord(id: string): void {
  const records = getRecords().filter(r => r.id !== id);
  saveRecords(records);

  // Delete from Supabase if online
  const supabase = getSupabaseClient();
  if (supabase) {
    supabase.from('records').delete().eq('id', id).then(
      () => {},
      (err) => console.debug('Delete sync skipped or offline:', err)
    );
  }
}

/**
 * Apply dataset pulled from Supabase to local storage cache
 */
export function applySupabaseSyncData(data: {
  teachers?: Teacher[];
  students?: Student[];
  records?: HafalanRecord[];
  users?: UserAccount[];
}): void {
  if (data.teachers && data.teachers.length > 0) {
    saveTeachers(data.teachers);
  }
  if (data.students && data.students.length > 0) {
    saveStudents(data.students);
  }
  if (data.records && data.records.length > 0) {
    saveRecords(data.records);
  }
  if (data.users && data.users.length > 0) {
    saveUserAccounts(data.users);
  }
}

// ----------------------------------------------------
// User Accounts & Authentication
// ----------------------------------------------------
export function getUserAccounts(): UserAccount[] {
  initStorage();
  try {
    const data = localStorage.getItem(KEY_USERS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveUserAccounts(users: UserAccount[]): void {
  localStorage.setItem(KEY_USERS, JSON.stringify(users));
}

export function getCurrentSession(): UserAccount | null {
  try {
    const saved = localStorage.getItem(KEY_SESSION);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function setCurrentSession(user: UserAccount | null): void {
  if (user) {
    localStorage.setItem(KEY_SESSION, JSON.stringify(user));
  } else {
    localStorage.removeItem(KEY_SESSION);
  }
  window.dispatchEvent(new Event('salam_session_changed'));
}

export function authenticate(usernameInput: string, passwordInput: string): { success: boolean; user?: UserAccount; error?: string } {
  const users = getUserAccounts();
  const cleanInput = usernameInput.trim().toLowerCase();

  // Find user matching username or flexible match
  const user = users.find(u => {
    const uName = u.username.toLowerCase();
    if (uName === cleanInput) return true;

    // Special case for wali login with flexible typing:
    // User might type: wali.1A.abimanyu or wali.1a.abimanyu.fachri.christianto
    if (u.role === 'wali' && (uName.includes(cleanInput) || cleanInput.includes(uName))) {
      return true;
    }

    // Special case for teacher typing their name
    if (u.role === 'guru') {
      const cleanTeacherName = u.fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanInputAlpha = cleanInput.replace(/[^a-z0-9]/g, '');
      if (cleanTeacherName.includes(cleanInputAlpha) && cleanInputAlpha.length > 3) {
        return true;
      }
    }

    return false;
  });

  if (!user) {
    return { success: false, error: 'Username tidak ditemukan. Pastikan format penulisan sesuai.' };
  }

  const validPassword = user.password || DEFAULT_PASSWORD;
  if (passwordInput !== validPassword) {
    return { success: false, error: 'Password salah. Password default adalah "salsabila3".' };
  }

  return { success: true, user };
}

export function changeUserPassword(userId: string, newPassword: string): boolean {
  const users = getUserAccounts();
  const index = users.findIndex(u => u.id === userId);
  if (index === -1) return false;

  users[index].password = newPassword;
  users[index].isDefaultPassword = false;
  saveUserAccounts(users);

  // Update current session if active
  const current = getCurrentSession();
  if (current && current.id === userId) {
    current.password = newPassword;
    current.isDefaultPassword = false;
    setCurrentSession(current);
  }

  return true;
}

export function resetUserPassword(userId: string): boolean {
  return changeUserPassword(userId, DEFAULT_PASSWORD);
}

export function resetAllPasswordsToDefault(): void {
  const users = getUserAccounts().map(u => ({
    ...u,
    password: DEFAULT_PASSWORD,
    isDefaultPassword: true
  }));
  saveUserAccounts(users);
  
  const current = getCurrentSession();
  if (current) {
    current.password = DEFAULT_PASSWORD;
    current.isDefaultPassword = true;
    setCurrentSession(current);
  }
}

// ----------------------------------------------------
// Rekap Bulanan Guru (Backend Helper Function)
// ----------------------------------------------------
export interface RekapSummary {
  records: HafalanRecord[];
  totalRecords: number;
  totalStudentsRecorded: number;
  tahsinCount: number;
  tahfidzCount: number;
  mumtazCount: number;
  jayyidJiddanCount: number;
  jayyidCount: number;
}

export function getRekapGuru(kelas: string, bulan: number | string, tahun: number | string): RekapSummary {
  const allRecords = getRecords();
  const monthNum = typeof bulan === 'string' ? parseInt(bulan, 10) : bulan;
  const yearNum = typeof tahun === 'string' ? parseInt(tahun, 10) : tahun;

  const filtered = allRecords.filter(r => {
    // Check class filter
    if (kelas && kelas !== 'Semua' && r.className !== kelas) {
      return false;
    }

    // Check date filter
    if (r.date) {
      const [recYear, recMonth] = r.date.split('-').map(Number);
      if (monthNum && recMonth !== monthNum) return false;
      if (yearNum && recYear !== yearNum) return false;
    }

    return true;
  });

  const uniqueStudentIds = new Set(filtered.map(r => r.studentId));

  return {
    records: filtered,
    totalRecords: filtered.length,
    totalStudentsRecorded: uniqueStudentIds.size,
    tahsinCount: filtered.filter(r => r.type === 'tahsin').length,
    tahfidzCount: filtered.filter(r => r.type === 'tahfidz').length,
    mumtazCount: filtered.filter(r => r.grade.includes('Mumtaz')).length,
    jayyidJiddanCount: filtered.filter(r => r.grade.includes('Jayyid Jiddan')).length,
    jayyidCount: filtered.filter(r => r.grade === 'B (Jayyid)').length,
  };
}

export const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Generates and downloads an authentic Microsoft Excel (.xlsx) file
 * compatible with MS Excel, Google Sheets, LibreOffice Calc
 */
export function exportRekapToExcel(
  records: HafalanRecord[],
  kelas: string,
  bulan: number | string,
  tahun: number | string,
  teacherName?: string
): void {
  const monthName = MONTH_NAMES_ID[Number(bulan) - 1] || `Bulan ${bulan}`;
  
  // Prepare structured rows
  const sheetData = [
    ['SD ISLAM TERPADU SALSABILA 3 BANGUNTAPAN'],
    ['LAPORAN REKAPITULASI HASIL CAPAIAN TAHSIN & TAHFIDZ AL-QUR\'AN'],
    [`Kelas: ${kelas === 'Semua' ? 'Seluruh Kelas (1A - 6C)' : `Kelas ${kelas}`} | Periode: ${monthName} ${tahun}`],
    [`Dicetak oleh: ${teacherName || 'Guru Qur\'an SDIT Salsabila 3'} pada: ${new Date().toLocaleDateString('id-ID')}`],
    [], // empty row
    [
      'No',
      'Tanggal',
      'Nama Peserta Didik',
      'Kelas',
      'Pelajaran',
      'Materi / Buku / Surah',
      'Halaman / Rentang Ayat',
      'Nilai Evaluasi',
      'Catatan Pembimbing',
      'Guru Qur\'an Penginput'
    ]
  ];

  records.forEach((r, idx) => {
    const materi = r.type === 'tahsin' ? (r.tahsinBook || '-') : `Surah ${r.surahName || ''} (Juz ${r.juz || '-'})`;
    const rentang = r.type === 'tahsin' ? (r.page || '-') : (r.ayatRange || '-');
    sheetData.push([
      (idx + 1).toString(),
      r.date,
      r.studentName,
      r.className,
      r.type === 'tahsin' ? 'Tahsin' : 'Tahfidz',
      materi,
      rentang,
      r.grade,
      r.notes || '-',
      r.teacherName
    ]);
  });

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Column widths
  ws['!cols'] = [
    { wch: 5 },  // No
    { wch: 12 }, // Tanggal
    { wch: 32 }, // Nama Siswa
    { wch: 8 },  // Kelas
    { wch: 10 }, // Pelajaran
    { wch: 25 }, // Materi
    { wch: 18 }, // Halaman/Ayat
    { wch: 20 }, // Nilai
    { wch: 35 }, // Catatan
    { wch: 30 }, // Guru
  ];

  XLSX.utils.book_append_sheet(wb, ws, `Rekap ${kelas}`);

  const fileName = `Rekap_Quran_SDIT_Salsabila3_${kelas}_${monthName}_${tahun}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Bulk Import students from CSV or Excel file
 */
export async function importStudentsFromFile(file: File): Promise<{ count: number; error?: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json: Record<string, string>[] = XLSX.utils.sheet_to_json(worksheet);

        let addedCount = 0;
        for (const row of json) {
          // Look for 'Nama' / 'Nama Siswa' / 'Name' and 'Kelas' / 'Class'
          const name = row['Nama'] || row['Nama Siswa'] || row['nama'] || row['name'];
          const className = row['Kelas'] || row['kelas'] || row['class'] || '1A';

          if (name && typeof name === 'string' && name.trim().length > 0) {
            addStudent(name.trim(), className.toString().trim().toUpperCase());
            addedCount++;
          }
        }

        resolve({ count: addedCount });
      } catch (err: unknown) {
        resolve({ count: 0, error: err instanceof Error ? err.message : 'Gagal membaca file' });
      }
    };
    reader.onerror = () => resolve({ count: 0, error: 'Gagal membuka file' });
    reader.readAsBinaryString(file);
  });
}
