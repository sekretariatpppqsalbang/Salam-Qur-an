export type Role = 'guru' | 'wali' | 'admin';

export type LearningType = 'tahsin' | 'tahfidz';

export type Grade = 'A (Mumtaz)' | 'A- (Jayyid Jiddan)' | 'B (Jayyid)';

export interface Teacher {
  id: string;
  name: string;
  username: string; // e.g. "annisa.galuh"
  title: string;
}

export interface Student {
  id: string;
  name: string;
  className: string; // e.g. "1A", "5B"
  waliUsername: string; // e.g. "wali.1A.abimanyu.fachri"
  parentPhone?: string;
}

export interface UserAccount {
  id: string;
  username: string;
  role: Role;
  fullName: string;
  password?: string;
  isDefaultPassword?: boolean;
  teacherId?: string;
  studentId?: string;
  className?: string;
}

export interface HafalanRecord {
  id: string;
  date: string; // YYYY-MM-DD
  studentId: string;
  studentName: string;
  className: string;
  teacherId: string;
  teacherName: string;
  type: LearningType;
  // Tahsin fields:
  tahsinBook?: string; // "Yanfa'una Jilid 1" - "Yanfa'una Jilid 5" or "Al-Qur'an"
  page?: string;
  // Tahfidz fields:
  juz?: number;
  surahNumber?: number;
  surahName?: string;
  ayatRange?: string; // e.g. "1 - 15"
  // Evaluation:
  grade: Grade;
  notes?: string;
  createdAt: string;
}

export interface SurahItem {
  number: number;
  nameLatin: string;
  nameArabic: string;
  ayatCount: number;
  juz: number;
}
