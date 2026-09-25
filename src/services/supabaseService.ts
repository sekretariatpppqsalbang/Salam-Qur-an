/**
 * Supabase Integration & Schema Helper for SALAM Quran
 * Ready for deployment to Vercel and connection to Supabase project
 */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
}

const STORAGE_KEY_SUPABASE = 'salam_quran_supabase_config';

export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const saved = localStorage.getItem(STORAGE_KEY_SUPABASE);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return {
        url: parsed.url || envUrl,
        anonKey: parsed.anonKey || envKey,
        isConnected: Boolean(parsed.url || envUrl)
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
  localStorage.setItem(STORAGE_KEY_SUPABASE, JSON.stringify(config));
}

/**
 * Returns ready-to-run PostgreSQL DDL script for Supabase SQL Editor
 */
export function getSupabaseSqlSchema(): string {
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
-- Catatan: Supabase otomatis memantau INSERT, UPDATE, dan DELETE secara realtime
BEGIN;
  -- Tambahkan tabel ke publikasi bawaan supabase_realtime jika belum ada
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
