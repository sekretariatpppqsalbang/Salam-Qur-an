/**
 * Supabase Integration & Complete Schema + Data Generator for SALAM Quran
 * SD Islam Terpadu Salsabila 3 Banguntapan
 * 
 * Supports:
 * - Online connection to Supabase project
 * - Realtime publication (supabase_realtime) for live updates
 * - Live subscription via postgres_changes on records, students, teachers, and users
 * - Full DDL Schema + RLS
 * - Complete SQL seed for all 18 teachers, 19 classes of students, and user accounts
 * - Bidirectional synchronization between local cache and Supabase PostgreSQL
 */

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { Teacher, Student, UserAccount, HafalanRecord } from '../types';
import { INITIAL_TEACHERS, INITIAL_STUDENTS } from '../data/initialData';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
}

export type RealtimeConnectionStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'ERROR';

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

let _cachedClient: SupabaseClient | null = null;
let _activeRealtimeChannel: RealtimeChannel | null = null;
let _realtimeStatus: RealtimeConnectionStatus = 'DISCONNECTED';

export function getRealtimeStatus(): RealtimeConnectionStatus {
  return _realtimeStatus;
}

function setRealtimeStatus(status: RealtimeConnectionStatus) {
  _realtimeStatus = status;
  window.dispatchEvent(new CustomEvent('salam_realtime_status_changed', { detail: { status } }));
}

export function saveSupabaseConfig(config: { url: string; anonKey: string }): void {
  const url = config.url.trim();
  const anonKey = config.anonKey.trim();
  localStorage.setItem(STORAGE_KEY_SUPABASE, JSON.stringify({ url, anonKey }));
  
  // Reset client and active channel
  stopRealtimeSubscription();
  _cachedClient = null;
  window.dispatchEvent(new Event('salam_supabase_config_changed'));
}

export function getSupabaseClient(): SupabaseClient | null {
  if (_cachedClient) return _cachedClient;

  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) return null;

  try {
    _cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 20,
        },
      },
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

// --------------------------------------------------------------------------
// Realtime Subscription with postgres_changes
// --------------------------------------------------------------------------

/**
 * Starts live realtime subscriptions using Supabase's `postgres_changes`.
 * Subscribes to events (INSERT, UPDATE, DELETE) across all 4 tables:
 * - records (Hafalan & Tahsin)
 * - students (Peserta Didik)
 * - teachers (Guru Qur'an)
 * - users (Akun Pengguna & Password)
 */
export function startRealtimeSubscription(onDataChanged?: () => void): (() => void) | null {
  const supabase = getSupabaseClient();
  if (!supabase) {
    setRealtimeStatus('DISCONNECTED');
    return null;
  }

  if (_activeRealtimeChannel) {
    return () => stopRealtimeSubscription();
  }

  setRealtimeStatus('CONNECTING');

  const channelName = 'salam_quran_postgres_changes';
  const channel = supabase.channel(channelName);

  // 1. Listen for changes on records table
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'records' },
    (payload) => {
      try {
        const stored = localStorage.getItem('salam_quran_records_prod_v2');
        let records: HafalanRecord[] = stored ? JSON.parse(stored) : [];

        if (payload.eventType === 'INSERT') {
          const r = payload.new as any;
          const newRec: HafalanRecord = {
            id: r.id,
            date: r.date,
            studentId: r.student_id,
            studentName: r.student_name,
            className: r.class_name,
            teacherId: r.teacher_id,
            teacherName: r.teacher_name,
            type: r.type,
            tahsinBook: r.tahsin_book || undefined,
            page: r.page || undefined,
            juz: r.juz ? Number(r.juz) : undefined,
            surahNumber: r.surah_number ? Number(r.surah_number) : undefined,
            surahName: r.surah_name || undefined,
            ayatRange: r.ayat_range || undefined,
            grade: r.grade,
            notes: r.notes || undefined,
            createdAt: r.created_at || new Date().toISOString(),
          };

          // Check if already exists
          const existingIdx = records.findIndex((item) => item.id === newRec.id);
          if (existingIdx >= 0) {
            records[existingIdx] = newRec;
          } else {
            records.unshift(newRec);
          }
          localStorage.setItem('salam_quran_records_prod_v2', JSON.stringify(records));
        } else if (payload.eventType === 'UPDATE') {
          const r = payload.new as any;
          const updatedRec: HafalanRecord = {
            id: r.id,
            date: r.date,
            studentId: r.student_id,
            studentName: r.student_name,
            className: r.class_name,
            teacherId: r.teacher_id,
            teacherName: r.teacher_name,
            type: r.type,
            tahsinBook: r.tahsin_book || undefined,
            page: r.page || undefined,
            juz: r.juz ? Number(r.juz) : undefined,
            surahNumber: r.surah_number ? Number(r.surah_number) : undefined,
            surahName: r.surah_name || undefined,
            ayatRange: r.ayat_range || undefined,
            grade: r.grade,
            notes: r.notes || undefined,
            createdAt: r.created_at || new Date().toISOString(),
          };

          const idx = records.findIndex((item) => item.id === updatedRec.id);
          if (idx >= 0) {
            records[idx] = updatedRec;
          } else {
            records.unshift(updatedRec);
          }
          localStorage.setItem('salam_quran_records_prod_v2', JSON.stringify(records));
        } else if (payload.eventType === 'DELETE') {
          const oldId = payload.old?.id;
          if (oldId) {
            records = records.filter((item) => item.id !== oldId);
            localStorage.setItem('salam_quran_records_prod_v2', JSON.stringify(records));
          }
        }

        window.dispatchEvent(new Event('salam_storage_changed'));
        if (onDataChanged) onDataChanged();
      } catch (err) {
        console.warn('Error processing realtime records payload:', err);
      }
    }
  );

  // 2. Listen for changes on students table
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'students' },
    (payload) => {
      try {
        const stored = localStorage.getItem('salam_quran_students_v1');
        let students: Student[] = stored ? JSON.parse(stored) : INITIAL_STUDENTS;

        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const s = payload.new as any;
          const studentItem: Student = {
            id: s.id,
            name: s.name,
            className: s.class_name,
            waliUsername: s.wali_username,
            parentPhone: s.parent_phone || undefined,
          };
          const idx = students.findIndex((item) => item.id === studentItem.id);
          if (idx >= 0) {
            students[idx] = studentItem;
          } else {
            students.push(studentItem);
          }
          localStorage.setItem('salam_quran_students_v1', JSON.stringify(students));
        } else if (payload.eventType === 'DELETE') {
          const oldId = payload.old?.id;
          if (oldId) {
            students = students.filter((item) => item.id !== oldId);
            localStorage.setItem('salam_quran_students_v1', JSON.stringify(students));
          }
        }

        window.dispatchEvent(new Event('salam_storage_changed'));
        if (onDataChanged) onDataChanged();
      } catch (err) {
        console.warn('Error processing realtime students payload:', err);
      }
    }
  );

  // 3. Listen for changes on teachers table
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'teachers' },
    (payload) => {
      try {
        const stored = localStorage.getItem('salam_quran_teachers_v1');
        let teachers: Teacher[] = stored ? JSON.parse(stored) : INITIAL_TEACHERS;

        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const t = payload.new as any;
          const teacherItem: Teacher = {
            id: t.id,
            name: t.name,
            title: t.title || "Guru Qur'an",
            username: t.username,
          };
          const idx = teachers.findIndex((item) => item.id === teacherItem.id);
          if (idx >= 0) {
            teachers[idx] = teacherItem;
          } else {
            teachers.push(teacherItem);
          }
          localStorage.setItem('salam_quran_teachers_v1', JSON.stringify(teachers));
        } else if (payload.eventType === 'DELETE') {
          const oldId = payload.old?.id;
          if (oldId) {
            teachers = teachers.filter((item) => item.id !== oldId);
            localStorage.setItem('salam_quran_teachers_v1', JSON.stringify(teachers));
          }
        }

        window.dispatchEvent(new Event('salam_storage_changed'));
        if (onDataChanged) onDataChanged();
      } catch (err) {
        console.warn('Error processing realtime teachers payload:', err);
      }
    }
  );

  // 4. Listen for changes on users table
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'users' },
    (payload) => {
      try {
        const stored = localStorage.getItem('salam_quran_users_v1');
        let users: UserAccount[] = stored ? JSON.parse(stored) : [];

        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const u = payload.new as any;
          const userItem: UserAccount = {
            id: u.id,
            username: u.username,
            fullName: u.full_name,
            role: u.role,
            password: u.password,
            isDefaultPassword: u.is_default_password,
            teacherId: u.teacher_id || undefined,
            studentId: u.student_id || undefined,
            className: u.class_name || undefined,
          };

          const idx = users.findIndex((item) => item.id === userItem.id);
          if (idx >= 0) {
            users[idx] = userItem;
          } else {
            users.push(userItem);
          }
          localStorage.setItem('salam_quran_users_v1', JSON.stringify(users));

          // If current session user was updated (e.g. password changed remotely), update current session
          const sessionStored = localStorage.getItem('salam_quran_session_v1');
          if (sessionStored) {
            const currentSession: UserAccount = JSON.parse(sessionStored);
            if (currentSession.id === userItem.id) {
              localStorage.setItem('salam_quran_session_v1', JSON.stringify(userItem));
              window.dispatchEvent(new Event('salam_session_changed'));
            }
          }
        } else if (payload.eventType === 'DELETE') {
          const oldId = payload.old?.id;
          if (oldId) {
            users = users.filter((item) => item.id !== oldId);
            localStorage.setItem('salam_quran_users_v1', JSON.stringify(users));
          }
        }

        window.dispatchEvent(new Event('salam_storage_changed'));
        if (onDataChanged) onDataChanged();
      } catch (err) {
        console.warn('Error processing realtime users payload:', err);
      }
    }
  );

  // Subscribe channel and track connection status
  channel.subscribe((status, err) => {
    if (status === 'SUBSCRIBED') {
      setRealtimeStatus('CONNECTED');
    } else if (status === 'CHANNEL_ERROR') {
      console.warn('Realtime channel error:', err);
      setRealtimeStatus('ERROR');
    } else if (status === 'TIMED_OUT') {
      console.warn('Realtime channel timed out, retrying...');
      setRealtimeStatus('CONNECTING');
    } else if (status === 'CLOSED') {
      setRealtimeStatus('DISCONNECTED');
    }
  });

  _activeRealtimeChannel = channel;

  return () => {
    stopRealtimeSubscription();
  };
}

export function stopRealtimeSubscription(): void {
  if (_activeRealtimeChannel) {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        supabase.removeChannel(_activeRealtimeChannel);
      }
    } catch {
      // ignore
    }
    _activeRealtimeChannel = null;
  }
  setRealtimeStatus('DISCONNECTED');
}

/**
 * Generates sample clean TypeScript subscription code for documentation and copy-pasting
 */
export function getSubscriptionCodeSample(): string {
  const config = getSupabaseConfig();
  const sampleUrl = config.url || 'https://YOUR_PROJECT_ID.supabase.co';
  const sampleKey = config.anonKey || 'YOUR_ANON_PUBLIC_KEY';

  return `// ========================================================
// KODE REALTIME SUBSCRIPTION SUPABASE (postgres_changes)
// SALAM Quran - SDIT Salsabila 3 Banguntapan
// ========================================================
// Kode ini berlangganan secara langsung ke perubahan database
// PostgreSQL (INSERT, UPDATE, DELETE) di tabel records,
// students, teachers, dan users secara real-time.
// ========================================================

import { createClient } from '@supabase/supabase-js';

// 1. Inisialisasi Supabase Client
const supabaseUrl = '${sampleUrl}';
const supabaseAnonKey = '${sampleKey}';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 2. Buat Channel Subscription Realtime
const channel = supabase
  .channel('salam_quran_postgres_changes')

  // ----------------------------------------------------
  // A. Langganan Setoran Hafalan & Tahsin Siswa (records)
  // ----------------------------------------------------
  .on(
    'postgres_changes',
    {
      event: '*', // Menangkap event INSERT, UPDATE, dan DELETE
      schema: 'public',
      table: 'records',
    },
    (payload) => {
      console.log('Perubahan Data Hafalan:', payload.eventType, payload.new || payload.old);
      // Contoh pembaruan UI:
      // if (payload.eventType === 'INSERT') addRecordToUI(payload.new);
      // if (payload.eventType === 'UPDATE') updateRecordInUI(payload.new);
      // if (payload.eventType === 'DELETE') removeRecordFromUI(payload.old.id);
    }
  )

  // ----------------------------------------------------
  // B. Langganan Data Peserta Didik (students)
  // ----------------------------------------------------
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'students',
    },
    (payload) => {
      console.log('Perubahan Data Siswa:', payload.eventType, payload.new || payload.old);
    }
  )

  // ----------------------------------------------------
  // C. Langganan Data Guru Pengampu (teachers)
  // ----------------------------------------------------
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'teachers',
    },
    (payload) => {
      console.log('Perubahan Data Guru:', payload.eventType, payload.new || payload.old);
    }
  )

  // ----------------------------------------------------
  // D. Langganan Akun Pengguna & Password (users)
  // ----------------------------------------------------
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'users',
    },
    (payload) => {
      console.log('Perubahan Akun Pengguna:', payload.eventType, payload.new || payload.old);
    }
  )

  // ----------------------------------------------------
  // E. Jalankan Subscription & Monitor Status Koneksi
  // ----------------------------------------------------
  .subscribe((status, err) => {
    if (status === 'SUBSCRIBED') {
      console.log('✅ Realtime postgres_changes aktif dan terhubung!');
    } else if (status === 'CHANNEL_ERROR') {
      console.error('❌ Terjadi kesalahan pada channel realtime:', err);
    } else if (status === 'TIMED_OUT') {
      console.warn('⚠️ Koneksi realtime timed out, mencoba menyambung ulang...');
    } else if (status === 'CLOSED') {
      console.log('ℹ️ Channel realtime ditutup.');
    }
  });

// Untuk berhenti berlangganan saat komponen unmount:
// export function cleanup() {
//   supabase.removeChannel(channel);
// }
`;
}

// --------------------------------------------------------------------------
// SQL Schema & Data Seed Generator
// --------------------------------------------------------------------------

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
-- 3. Tempelkan seluruh skrip ini dan klik "RUN"
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

-- 7. Kebijakan Akses (RLS Policies Permisif untuk Anon Key PWA)
DROP POLICY IF EXISTS "Public Full Access Teachers" ON public.teachers;
CREATE POLICY "Public Full Access Teachers" ON public.teachers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access Students" ON public.students;
CREATE POLICY "Public Full Access Students" ON public.students FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access Users" ON public.users;
CREATE POLICY "Public Full Access Users" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access Records" ON public.records;
CREATE POLICY "Public Full Access Records" ON public.records FOR ALL USING (true) WITH CHECK (true);

-- 8. REPLICA IDENTITY FULL (Wajib untuk Supabase Realtime CDC postgres_changes)
ALTER TABLE public.records REPLICA IDENTITY FULL;
ALTER TABLE public.students REPLICA IDENTITY FULL;
ALTER TABLE public.teachers REPLICA IDENTITY FULL;
ALTER TABLE public.users REPLICA IDENTITY FULL;

-- 9. Daftarkan Seluruh Tabel ke Publikasi Supabase Realtime
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
END $$;
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
  username = EXCLUDED.username;\n\n`;

  // 2. INSERT DATA SISWA
  sql += `-- 2. INSERT DATA PESERTA DIDIK (${students.length} Siswa, 19 Kelas)\n`;
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
      sql += `ON CONFLICT (id) DO UPDATE SET
  date = EXCLUDED.date,
  student_name = EXCLUDED.student_name,
  class_name = EXCLUDED.class_name,
  teacher_name = EXCLUDED.teacher_name,
  type = EXCLUDED.type,
  tahsin_book = EXCLUDED.tahsin_book,
  page = EXCLUDED.page,
  juz = EXCLUDED.juz,
  surah_number = EXCLUDED.surah_number,
  surah_name = EXCLUDED.surah_name,
  ayat_range = EXCLUDED.ayat_range,
  grade = EXCLUDED.grade,
  notes = EXCLUDED.notes;\n\n`;
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

export function getSupabaseSqlSchema(): string {
  return getCompleteSupabaseSql();
}

// --------------------------------------------------------------------------
// Online Synchronizations & CRUD Helpers
// --------------------------------------------------------------------------

/**
 * Upsert single record to Supabase
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
 * Delete single record from Supabase
 */
export async function deleteRecordFromSupabase(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('records').delete().eq('id', id);
    if (error) {
      console.warn('Supabase delete record warning:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Failed to delete record from Supabase:', err);
    return false;
  }
}

/**
 * Upsert student & corresponding wali user to Supabase
 */
export async function pushStudentToSupabase(student: Student, userAccount?: UserAccount): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error: sErr } = await supabase.from('students').upsert({
      id: student.id,
      name: student.name,
      class_name: student.className,
      wali_username: student.waliUsername,
      parent_phone: student.parentPhone || null,
    });
    if (sErr) throw sErr;

    if (userAccount) {
      await supabase.from('users').upsert({
        id: userAccount.id,
        username: userAccount.username,
        full_name: userAccount.fullName,
        role: userAccount.role,
        password: userAccount.password || 'salsabila3',
        is_default_password: userAccount.isDefaultPassword ?? true,
        student_id: student.id,
        class_name: student.className,
      });
    }

    return true;
  } catch (err) {
    console.warn('Failed to push student to Supabase:', err);
    return false;
  }
}

/**
 * Delete student and related records/user from Supabase
 */
export async function deleteStudentFromSupabase(studentId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    await supabase.from('records').delete().eq('student_id', studentId);
    await supabase.from('users').delete().eq('student_id', studentId);
    const { error } = await supabase.from('students').delete().eq('id', studentId);
    return !error;
  } catch (err) {
    console.warn('Failed to delete student from Supabase:', err);
    return false;
  }
}

/**
 * Upsert teacher & corresponding guru user to Supabase
 */
export async function pushTeacherToSupabase(teacher: Teacher, userAccount?: UserAccount): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error: tErr } = await supabase.from('teachers').upsert({
      id: teacher.id,
      name: teacher.name,
      title: teacher.title || "Guru Qur'an",
      username: teacher.username,
    });
    if (tErr) throw tErr;

    if (userAccount) {
      await supabase.from('users').upsert({
        id: userAccount.id,
        username: userAccount.username,
        full_name: userAccount.fullName,
        role: userAccount.role,
        password: userAccount.password || 'salsabila3',
        is_default_password: userAccount.isDefaultPassword ?? true,
        teacher_id: teacher.id,
      });
    }

    return true;
  } catch (err) {
    console.warn('Failed to push teacher to Supabase:', err);
    return false;
  }
}

/**
 * Delete teacher from Supabase
 */
export async function deleteTeacherFromSupabase(teacherId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    await supabase.from('users').delete().eq('teacher_id', teacherId);
    const { error } = await supabase.from('teachers').delete().eq('id', teacherId);
    return !error;
  } catch (err) {
    console.warn('Failed to delete teacher from Supabase:', err);
    return false;
  }
}

/**
 * Update user password in Supabase
 */
export async function updateUserPasswordInSupabase(userId: string, newPassword: string, isDefaultPassword = false): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('users').update({
      password: newPassword,
      is_default_password: isDefaultPassword,
    }).eq('id', userId);
    return !error;
  } catch (err) {
    console.warn('Failed to update password in Supabase:', err);
    return false;
  }
}

/**
 * Batch push all local data to Supabase (Seeding / syncing from browser directly)
 */
export async function pushAllDataToSupabase(
  teachers: Teacher[],
  students: Student[],
  users: UserAccount[],
  records: HafalanRecord[]
): Promise<{ success: boolean; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, message: 'Supabase belum terkonfigurasi.' };
  }

  try {
    // 1. Teachers
    if (teachers.length > 0) {
      const teachersPayload = teachers.map((t) => ({
        id: t.id,
        name: t.name,
        title: t.title || "Guru Qur'an",
        username: t.username,
      }));
      const { error: tErr } = await supabase.from('teachers').upsert(teachersPayload);
      if (tErr) throw new Error(`Guru: ${tErr.message}`);
    }

    // 2. Students in batches of 100
    const BATCH_SIZE = 100;
    for (let i = 0; i < students.length; i += BATCH_SIZE) {
      const chunk = students.slice(i, i + BATCH_SIZE).map((s) => ({
        id: s.id,
        name: s.name,
        class_name: s.className,
        wali_username: s.waliUsername,
        parent_phone: s.parentPhone || null,
      }));
      const { error: sErr } = await supabase.from('students').upsert(chunk);
      if (sErr) throw new Error(`Siswa: ${sErr.message}`);
    }

    // 3. Users in batches of 100
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const chunk = users.slice(i, i + BATCH_SIZE).map((u) => ({
        id: u.id,
        username: u.username,
        full_name: u.fullName,
        role: u.role,
        password: u.password || 'salsabila3',
        is_default_password: u.isDefaultPassword ?? true,
        teacher_id: u.teacherId || null,
        student_id: u.studentId || null,
        class_name: u.className || null,
      }));
      const { error: uErr } = await supabase.from('users').upsert(chunk);
      if (uErr) throw new Error(`Akun Pengguna: ${uErr.message}`);
    }

    // 4. Records in batches of 100
    if (records.length > 0) {
      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const chunk = records.slice(i, i + BATCH_SIZE).map((r) => ({
          id: r.id,
          date: r.date,
          student_id: r.studentId,
          student_name: r.studentName,
          class_name: r.className,
          teacher_id: r.teacherId,
          teacher_name: r.teacherName,
          type: r.type,
          tahsin_book: r.tahsinBook || null,
          page: r.page || null,
          juz: r.juz || null,
          surah_number: r.surahNumber || null,
          surah_name: r.surahName || null,
          ayat_range: r.ayatRange || null,
          grade: r.grade,
          notes: r.notes || null,
          created_at: r.createdAt || new Date().toISOString(),
        }));
        const { error: rErr } = await supabase.from('records').upsert(chunk);
        if (rErr) throw new Error(`Catatan: ${rErr.message}`);
      }
    }

    return {
      success: true,
      message: `Berhasil mengunggah seluruh data ke Supabase! (${teachers.length} Guru, ${students.length} Siswa, ${users.length} Akun, ${records.length} Catatan)`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal mengirim data ke Supabase';
    return { success: false, message: msg };
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

/**
 * Online authentication fallback: checks Supabase users table directly
 */
export async function authenticateWithSupabase(usernameInput: string, passwordInput: string): Promise<{
  success: boolean;
  user?: UserAccount;
  error?: string;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, error: 'Koneksi online tidak tersedia.' };
  }

  try {
    const cleanUsername = usernameInput.trim().toLowerCase();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .ilike('username', cleanUsername)
      .limit(1);

    if (error || !data || data.length === 0) {
      return { success: false, error: 'Username tidak ditemukan di database Supabase.' };
    }

    const row = data[0];
    const validPassword = row.password || 'salsabila3';
    if (passwordInput !== validPassword) {
      return { success: false, error: 'Password salah.' };
    }

    const user: UserAccount = {
      id: row.id,
      username: row.username,
      fullName: row.full_name,
      role: row.role,
      password: row.password,
      isDefaultPassword: row.is_default_password,
      teacherId: row.teacher_id,
      studentId: row.student_id,
      className: row.class_name,
    };

    return { success: true, user };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal verifikasi login ke Supabase.';
    return { success: false, error: msg };
  }
}
