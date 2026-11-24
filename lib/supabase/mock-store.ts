import fs from 'fs';
import path from 'path';
import {
  Profile,
  Semester,
  Course,
  Section,
  StudentCourse,
  AttendanceLocation,
  AttendanceSession,
  AttendanceRecord,
  AuditLog,
  OutgoingEmail,
} from '@/types';

export interface GlobalStore {
  semesters: Semester[];
  courses: Course[];
  sections: Section[];
  studentCourses: StudentCourse[];
  profiles: Profile[];
  locations: AttendanceLocation[];
  sessions: AttendanceSession[];
  records: AttendanceRecord[];
  auditLogs: AuditLog[];
  outgoingEmails: OutgoingEmail[];
}

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'attendance-db.json');

function loadStoreFromFile(): GlobalStore {
  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const raw = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        semesters: Array.isArray(parsed.semesters) ? parsed.semesters : [],
        courses: Array.isArray(parsed.courses) ? parsed.courses : [],
        sections: Array.isArray(parsed.sections) ? parsed.sections : [],
        studentCourses: Array.isArray(parsed.studentCourses) ? parsed.studentCourses : [],
        profiles: Array.isArray(parsed.profiles) ? parsed.profiles : [],
        locations: Array.isArray(parsed.locations) ? parsed.locations : [],
        sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
        records: Array.isArray(parsed.records) ? parsed.records : [],
        auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
        outgoingEmails: Array.isArray(parsed.outgoingEmails) ? parsed.outgoingEmails : [],
      };
    }
  } catch (err) {
    console.error('Error reading persistence file:', err);
  }

  // Clean empty state - ZERO dummy data
  return {
    semesters: [],
    courses: [],
    sections: [],
    studentCourses: [],
    profiles: [],
    locations: [],
    sessions: [],
    records: [],
    auditLogs: [],
    outgoingEmails: [],
  };
}

export function saveStore() {
  try {
    if (typeof window === 'undefined' && globalThis.__ATTENDANCE_STORE__) {
      const dir = path.dirname(DATA_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(
        DATA_FILE_PATH,
        JSON.stringify(globalThis.__ATTENDANCE_STORE__, null, 2),
        'utf-8'
      );
    }
  } catch (err) {
    console.error('Failed to persist store to disk:', err);
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __ATTENDANCE_STORE__: GlobalStore | undefined;
}

if (!globalThis.__ATTENDANCE_STORE__) {
  globalThis.__ATTENDANCE_STORE__ = loadStoreFromFile();
}

export const mockStore = globalThis.__ATTENDANCE_STORE__;

export function isUsingMockData(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !url || url.includes('your-project-id') || url.includes('demo-attendance-app');
}
