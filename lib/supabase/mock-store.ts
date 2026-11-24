function getNodeFs(): any {
  try {
    return typeof process !== 'undefined' && process.env?.NEXT_RUNTIME !== 'edge' ? eval('require')('fs') : null;
  } catch {
    return null;
  }
}

function getNodePath(): any {
  try {
    return typeof process !== 'undefined' && process.env?.NEXT_RUNTIME !== 'edge' ? eval('require')('path') : null;
  } catch {
    return null;
  }
}

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
  EmailSettings,
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
  emailSettings?: EmailSettings;
}

function loadStoreFromFile(): GlobalStore {
  try {
    const fs = getNodeFs();
    const path = getNodePath();
    if (fs && path && typeof process !== 'undefined' && process.cwd) {
      const dataFilePath = path.join(process.cwd(), 'data', 'attendance-db.json');
      if (fs.existsSync(dataFilePath)) {
        const raw = fs.readFileSync(dataFilePath, 'utf-8');
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
          emailSettings: parsed.emailSettings || {
            smtpHost: 'smtp.gmail.com',
            smtpPort: 465,
            smtpUser: 'bhuvansondabhvi@gmail.com',
            senderName: 'GPS Attendance System',
            senderEmail: 'bhuvansondabhvi@gmail.com',
            directSendEnabled: true,
          },
        };
      }
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
    emailSettings: {
      smtpHost: 'smtp.gmail.com',
      smtpPort: 465,
      smtpUser: 'bhuvansondabhvi@gmail.com',
      senderName: 'GPS Attendance System',
      senderEmail: 'bhuvansondabhvi@gmail.com',
      directSendEnabled: true,
    },
  };
}

export function saveStore() {
  try {
    const fs = getNodeFs();
    const path = getNodePath();
    if (fs && path && typeof window === 'undefined' && globalThis.__ATTENDANCE_STORE__ && typeof process !== 'undefined' && process.cwd) {
      const dataFilePath = path.join(process.cwd(), 'data', 'attendance-db.json');
      const dir = path.dirname(dataFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(
        dataFilePath,
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
