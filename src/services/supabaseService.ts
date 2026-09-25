/**
 * Supabase Integration & Complete Schema + Data Generator for SALAM Quran
 * SD Islam Terpadu Salsabila 3 Banguntapan
 * 
 * Supports:
 * - Online connection to Supabase project
 * - Realtime publication (supabase_realtime) for live updates
 * - Full DDL Schema + RLS
 * - Complete SQL seed for all 18 teachers, 19 classes of students, and user accounts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Teacher, Student, UserAccount, HafalanRecord } from '../types';
import { INITIAL_TEACHERS, INITIAL_STUDENTS } from '../data/initialData';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
}

const STORAGE_KEY_SUPABASE = 'salam_quran_supabase_config';

export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  const saved = localStorage.getItem(STORAGE_KEY_SUPABASE);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      const url = (parsed.url || envUrl).trim();
      const anonKey = (parsed.anonKey || envKey).trim();
      return {
        url,
        anonKey,
        isConnected: Boolean(url && anonKey)
      };
    } catch {
      // ignore
    }
  }

  return {
    url: envUrl,
    anonKey: envKey,
    isConnected: Boolean(envUrl && envKey)
  };
}

export function saveSupabaseConfig(config: { url: string; anonKey: string }): void {
  const url = config.url.trim();
  const anonKey = config.anonKey.trim();
  localStorage.setItem(STORAGE_KEY_SUPABASE, JSON.stringify({ url, anonKey }));
  _cachedClient = null; // reset client
  window.dispatchEvent(new Event('salam_supabase_config_changed'));
}

let _cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (_cachedClient) return _cachedClient;

  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) return null;

  try {
    _cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
    return _cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

/**
 * Test connectivity with Supabase project
 */
export async function testSupabaseConnection(customUrl?: string, customKey?: string): Promise<{ success: boolean; message: string }> {
  const url = (customUrl || getSupabaseConfig().url).trim();
  const anonKey = (customKey || getSupabaseConfig().anonKey).trim();

  if (!url || !anonKey) {
    return { success: false, message: 'URL Project dan Anon Public Key Supabase wajib diisi.' };
  }

  try {
    const testClient = createClient(url, anonKey, { auth: { persistSession: false } });
    
    // Quick probe query to check if server responds
    const { error } = await testClient.from('teachers').select('id').limit(1);
    
    if (error) {
      // If table doesn't exist yet, connection is still valid (endpoint reached)
      if (error.code === '42P01' || error.message.includes('relation "teachers" does not exist') || error.message.includes('does not exist')) {
        return {
          success: true,
          message: 'Berhasil terhubung ke Supabase! Tabel belum dibuat, silakan jalankan Skrip SQL di SQL Editor Supabase.'
        };
      }
      return { success: false, message: `Gagal query: ${error.message} (${error.code || ''})` };
    }

    return {
      success: true,
      message: 'Koneksi ke Supabase aktif & tabel database siap digunakan!'
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Koneksi gagal periksa URL dan Key Anda.';
    return { success: false, message: `Error: ${msg}` };
  }
}

/**
 * Escape single quotes for SQL string literals
 */
function sqlEscape(val: string | null | undefined): string {
  if (val === null || val === undefined) return 'NULL';
  return `'${val.replace(/'/g, "''")}'`;
}

/**
 * Generates SQL DDL Schema with Realtime configuration
 */
export function getSupabaseDdlSchema(): string {
  return `-- ========================================================
-- SALAM QURAN - SDIT SALSABILA 3 BANGUNTAPAN
-- SUPABASE DATABASE SCHEMA WITH REALTIME REPLICATION
-- ========================================================
-- Petunjuk:
-- 1. Buka dashboard Supabase (https://app.supabase.com)
-- 2. Pilih project Anda -> Masuk ke menu "SQL Editor"
-- 3. Tempelkan seluruh skrip di bawah ini dan klik "RUN"
-- 4. Semua tabel otomatis terdaftar di "supabase_realtime"
-- ========================================================

-- 1. Tabel Guru Pengampu (Teachers)
CREATE TABLE IF NOT EXISTS public.teachers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    title TEXT DEFAULT 'Guru Qur''an',
    username TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabel Peserta Didik (Students)
CREATE TABLE IF NOT EXISTS public.students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    class_name TEXT NOT NULL,
    wali_username TEXT UNIQUE NOT NULL,
    parent_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabel Akun Pengguna (Users & Roles)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('guru', 'wali', 'admin')),
    password TEXT NOT NULL DEFAULT 'salsabila3',
    is_default_password BOOLEAN DEFAULT TRUE,
    teacher_id TEXT REFERENCES public.teachers(id) ON DELETE SET NULL,
    student_id TEXT REFERENCES public.students(id) ON DELETE SET NULL,
    class_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabel Log Setoran Hafalan & Bacaan (Hafalan Records)
CREATE TABLE IF NOT EXISTS public.records (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    student_id TEXT REFERENCES public.students(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    class_name TEXT NOT NULL,
    teacher_id TEXT REFERENCES public.teachers(id) ON DELETE SET NULL,
    teacher_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('tahsin', 'tahfidz')),
    tahsin_book TEXT,
    page TEXT,
    juz INTEGER,
    surah_number INTEGER,
    surah_name TEXT,
    ayat_range TEXT,
    grade TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Indeks untuk Performa Kueri Cepat
CREATE INDEX IF NOT EXISTS idx_records_student_id ON public.records(student_id);
CREATE INDEX IF NOT EXISTS idx_records_class_date ON public.records(class_name, date);
CREATE INDEX IF NOT EXISTS idx_records_date ON public.records(date DESC);
CREATE INDEX IF NOT EXISTS idx_students_class ON public.students(class_name);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

-- 6. Aktifkan Row Level Security (RLS)
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;

-- 7. Kebijakan Akses (RLS Policies)
DROP POLICY IF EXISTS "Public Read Teachers" ON public.teachers;
DROP POLICY IF EXISTS "Public Insert/Update Teachers" ON public.teachers;
CREATE POLICY "Public Read Teachers" ON public.teachers FOR SELECT USING (true);
CREATE POLICY "Public Insert/Update Teachers" ON public.teachers FOR ALL USING (true);

DROP POLICY IF EXISTS "Public Read Students" ON public.students;
DROP POLICY IF EXISTS "Public Insert/Update Students" ON public.students;
CREATE POLICY "Public Read Students" ON public.students FOR SELECT USING (true);
CREATE POLICY "Public Insert/Update Students" ON public.students FOR ALL USING (true);

DROP POLICY IF EXISTS "Public Read Users" ON public.users;
DROP POLICY IF EXISTS "Public Modify Users" ON public.users;
CREATE POLICY "Public Read Users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Public Modify Users" ON public.users FOR ALL USING (true);

DROP POLICY IF EXISTS "Public Read Records" ON public.records;
DROP POLICY IF EXISTS "Public Insert Records" ON public.records;
DROP POLICY IF EXISTS "Public Update Records" ON public.records;
DROP POLICY IF EXISTS "Public Delete Records" ON public.records;
CREATE POLICY "Public Read Records" ON public.records FOR SELECT USING (true);
CREATE POLICY "Public Insert Records" ON public.records FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Records" ON public.records FOR UPDATE USING (true);
CREATE POLICY "Public Delete Records" ON public.records FOR DELETE USING (true);

-- 8. REPLICA IDENTITY FULL (Wajib untuk Supabase Realtime CDC)
ALTER TABLE public.records REPLICA IDENTITY FULL;
ALTER TABLE public.students REPLICA IDENTITY FULL;
ALTER TABLE public.teachers REPLICA IDENTITY FULL;
ALTER TABLE public.users REPLICA IDENTITY FULL;

-- 9. Daftarkan Tabel ke Publikasi Supabase Realtime
BEGIN;
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'records'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.records;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'students'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'teachers'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.teachers;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'users'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
    END IF;
  END
  $$;
COMMIT;
`;
}

/**
 * Generates SQL INSERT statements for all teachers, students, user accounts, and records
 */
export function getSupabaseSeedDataSql(
  teachersList?: Teacher[],
  studentsList?: Student[],
  usersList?: UserAccount[],
  recordsList?: HafalanRecord[]
): string {
  const teachers = teachersList && teachersList.length > 0 ? teachersList : INITIAL_TEACHERS;
  const students = studentsList && studentsList.length > 0 ? studentsList : INITIAL_STUDENTS;
  
  // Build user accounts if not provided
  let users = usersList;
  if (!users || users.length === 0) {
    users = [
      {
        id: 'user_admin',
        username: 'admin',
        fullName: 'Administrator Sekolah',
        role: 'admin',
        password: 'salsabila3',
        isDefaultPassword: true,
      }
    ];

    for (const t of teachers) {
      users.push({
        id: `u_${t.id}`,
        username: t.username,
        fullName: t.name,
        role: 'guru',
        password: 'salsabila3',
        isDefaultPassword: true,
        teacherId: t.id
      });
    }

    for (const s of students) {
      users.push({
        id: `u_${s.id}`,
        username: s.waliUsername,
        fullName: `Wali dari ${s.name}`,
        role: 'wali',
        password: 'salsabila3',
        isDefaultPassword: true,
        studentId: s.id,
        className: s.className
      });
    }
  }

  let sql = `-- ========================================================
-- DATA SEED: SELURUH DATA MASTER SDIT SALSABILA 3 BANGUNTAPAN
-- Total: ${teachers.length} Guru, ${students.length} Siswa (19 Kelas), ${users.length} Akun Pengguna
-- ========================================================

-- 1. INSERT DATA GURU PENGAMPU (${teachers.length} Guru)
INSERT INTO public.teachers (id, name, title, username) VALUES
`;

  const teacherRows = teachers.map(
    t => `  (${sqlEscape(t.id)}, ${sqlEscape(t.name)}, ${sqlEscape(t.title || "Guru Qur'an")}, ${sqlEscape(t.username)})`
  );
  sql += teacherRows.join(',\n') + '\n';
  sql += `ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  title = EXCLUDED.title,
  username = EXCLUDED.username;

`;

  // 2. INSERT DATA SISWA
  sql += `-- 2. INSERT DATA PESERTA DIDIK (${students.length} Siswa, 19 Kelas)\n`;
  // Chunk in batches of 100 for maximum PostgreSQL parsing reliability
  const CHUNK_SIZE = 100;
  for (let i = 0; i < students.length; i += CHUNK_SIZE) {
    const chunk = students.slice(i, i + CHUNK_SIZE);
    sql += `INSERT INTO public.students (id, name, class_name, wali_username) VALUES\n`;
    const studentRows = chunk.map(
      s => `  (${sqlEscape(s.id)}, ${sqlEscape(s.name)}, ${sqlEscape(s.className)}, ${sqlEscape(s.waliUsername)})`
    );
    sql += studentRows.join(',\n') + '\n';
    sql += `ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  class_name = EXCLUDED.class_name,
  wali_username = EXCLUDED.wali_username;\n\n`;
  }

  // 3. INSERT USER ACCOUNTS
  sql += `-- 3. INSERT AKUN PENGGUNA (Admin, Guru, dan Seluruh Wali Siswa - ${users.length} Akun)\n`;
  for (let i = 0; i < users.length; i += CHUNK_SIZE) {
    const chunk = users.slice(i, i + CHUNK_SIZE);
    sql += `INSERT INTO public.users (id, username, full_name, role, password, is_default_password, teacher_id, student_id, class_name) VALUES\n`;
    const userRows = chunk.map(
      u => `  (${sqlEscape(u.id)}, ${sqlEscape(u.username)}, ${sqlEscape(u.fullName)}, ${sqlEscape(u.role)}, ${sqlEscape(u.password || 'salsabila3')}, ${u.isDefaultPassword ? 'true' : 'false'}, ${u.teacherId ? sqlEscape(u.teacherId) : 'NULL'}, ${u.studentId ? sqlEscape(u.studentId) : 'NULL'}, ${u.className ? sqlEscape(u.className) : 'NULL'})`
    );
    sql += userRows.join(',\n') + '\n';
    sql += `ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  password = EXCLUDED.password,
  is_default_password = EXCLUDED.is_default_password,
  teacher_id = EXCLUDED.teacher_id,
  student_id = EXCLUDED.student_id,
  class_name = EXCLUDED.class_name;\n\n`;
  }

  // 4. INSERT RECORDS (IF ANY)
  if (recordsList && recordsList.length > 0) {
    sql += `-- 4. INSERT DATA SETORAN HAFALAN & TAHSIN (${recordsList.length} Catatan)\n`;
    for (let i = 0; i < recordsList.length; i += CHUNK_SIZE) {
      const chunk = recordsList.slice(i, i + CHUNK_SIZE);
      sql += `INSERT INTO public.records (id, date, student_id, student_name, class_name, teacher_id, teacher_name, type, tahsin_book, page, juz, surah_number, surah_name, ayat_range, grade, notes, created_at) VALUES\n`;
      const recordRows = chunk.map(
        r => `  (${sqlEscape(r.id)}, ${sqlEscape(r.date)}, ${sqlEscape(r.studentId)}, ${sqlEscape(r.studentName)}, ${sqlEscape(r.className)}, ${sqlEscape(r.teacherId)}, ${sqlEscape(r.teacherName)}, ${sqlEscape(r.type)}, ${sqlEscape(r.tahsinBook)}, ${sqlEscape(r.page)}, ${r.juz || 'NULL'}, ${r.surahNumber || 'NULL'}, ${sqlEscape(r.surahName)}, ${sqlEscape(r.ayatRange)}, ${sqlEscape(r.grade)}, ${sqlEscape(r.notes)}, ${sqlEscape(r.createdAt || new Date().toISOString())})`
      );
      sql += recordRows.join(',\n') + '\n';
      sql += `ON CONFLICT (id) DO NOTHING;\n\n`;
    }
  }

  return sql;
}

/**
 * Returns complete combined DDL + Realtime + Seed Data SQL ready to copy and run
 */
export function getCompleteSupabaseSql(
  teachersList?: Teacher[],
  studentsList?: Student[],
  usersList?: UserAccount[],
  recordsList?: HafalanRecord[]
): string {
  const ddl = getSupabaseDdlSchema();
  const seed = getSupabaseSeedDataSql(teachersList, studentsList, usersList, recordsList);
  return `${ddl}
-- ========================================================
-- EKSEKUSI DATA SEED OTOMATIS
-- ========================================================
${seed}`;
}

/**
 * Legacy alias for backwards compatibility
 */
export function getSupabaseSqlSchema(): string {
  return getCompleteSupabaseSql();
}

/**
 * Upload local records to Supabase online database
 */
export async function pushRecordToSupabase(record: HafalanRecord): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('records').upsert({
      id: record.id,
      date: record.date,
      student_id: record.studentId,
      student_name: record.studentName,
      class_name: record.className,
      teacher_id: record.teacherId,
      teacher_name: record.teacherName,
      type: record.type,
      tahsin_book: record.tahsinBook || null,
      page: record.page || null,
      juz: record.juz || null,
      surah_number: record.surahNumber || null,
      surah_name: record.surahName || null,
      ayat_range: record.ayatRange || null,
      grade: record.grade,
      notes: record.notes || null,
      created_at: record.createdAt || new Date().toISOString(),
    });

    if (error) {
      console.warn('Supabase upsert record warning:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Failed to push record to Supabase:', err);
    return false;
  }
}

/**
 * Sync entire dataset from Supabase online database to local cache
 */
export async function fetchAllFromSupabase(): Promise<{
  teachers?: Teacher[];
  students?: Student[];
  records?: HafalanRecord[];
  users?: UserAccount[];
  error?: string;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { error: 'Supabase belum dikonfigurasi.' };
  }

  try {
    // 1. Fetch teachers
    const { data: teachersData, error: tErr } = await supabase
      .from('teachers')
      .select('*')
      .order('name');
    if (tErr) throw tErr;

    // 2. Fetch students
    const { data: studentsData, error: sErr } = await supabase
      .from('students')
      .select('*')
      .order('class_name')
      .order('name');
    if (sErr) throw sErr;

    // 3. Fetch records
    const { data: recordsData, error: rErr } = await supabase
      .from('records')
      .select('*')
      .order('date', { ascending: false });
    if (rErr) throw rErr;

    // 4. Fetch users
    const { data: usersData, error: uErr } = await supabase
      .from('users')
      .select('*');
    if (uErr) throw uErr;

    const teachers: Teacher[] = (teachersData || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      title: t.title,
      username: t.username,
    }));

    const students: Student[] = (studentsData || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      className: s.class_name,
      waliUsername: s.wali_username,
      parentPhone: s.parent_phone,
    }));

    const records: HafalanRecord[] = (recordsData || []).map((r: any) => ({
      id: r.id,
      date: r.date,
      studentId: r.student_id,
      studentName: r.student_name,
      className: r.class_name,
      teacherId: r.teacher_id,
      teacherName: r.teacher_name,
      type: r.type,
      tahsinBook: r.tahsin_book,
      page: r.page,
      juz: r.juz,
      surahNumber: r.surah_number,
      surahName: r.surah_name,
      ayatRange: r.ayat_range,
      grade: r.grade,
      notes: r.notes,
      createdAt: r.created_at,
    }));

    const users: UserAccount[] = (usersData || []).map((u: any) => ({
      id: u.id,
      username: u.username,
      fullName: u.full_name,
      role: u.role,
      password: u.password,
      isDefaultPassword: u.is_default_password,
      teacherId: u.teacher_id,
      studentId: u.student_id,
      className: u.class_name,
    }));

    return { teachers, students, records, users };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal mengambil data dari Supabase.';
    return { error: msg };
  }
}
