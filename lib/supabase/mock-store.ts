import {
  Profile,
  AttendanceLocation,
  AttendanceSession,
  AttendanceRecord,
  AuditLog,
} from '@/types';

// In-memory data store for local development and testing
interface GlobalStore {
  profiles: Profile[];
  locations: AttendanceLocation[];
  sessions: AttendanceSession[];
  records: AttendanceRecord[];
  auditLogs: AuditLog[];
}

// 17 Demo Students
const initialStudents: Profile[] = [
  { id: 'st-001', name: 'Arun Kumar', email: 'arun.kumar@demo.college.edu', role: 'STUDENT', usn: 'USN001', semester: '5', section: 'A', active: true },
  { id: 'st-002', name: 'Bhavya S.', email: 'bhavya.s@demo.college.edu', role: 'STUDENT', usn: 'USN002', semester: '5', section: 'A', active: true },
  { id: 'st-003', name: 'Chetan Rao', email: 'chetan.rao@demo.college.edu', role: 'STUDENT', usn: 'USN003', semester: '5', section: 'A', active: true },
  { id: 'st-004', name: 'Divya Murthy', email: 'divya.murthy@demo.college.edu', role: 'STUDENT', usn: 'USN004', semester: '5', section: 'A', active: true },
  { id: 'st-005', name: 'Eshwar Patel', email: 'eshwar.patel@demo.college.edu', role: 'STUDENT', usn: 'USN005', semester: '5', section: 'A', active: true },
  { id: 'st-006', name: 'Farhan Ali', email: 'farhan.ali@demo.college.edu', role: 'STUDENT', usn: 'USN006', semester: '5', section: 'A', active: true },
  { id: 'st-007', name: 'Gayatri Joshi', email: 'gayatri.joshi@demo.college.edu', role: 'STUDENT', usn: 'USN007', semester: '5', section: 'A', active: true },
  { id: 'st-008', name: 'Harsh Vardhan', email: 'harsh.vardhan@demo.college.edu', role: 'STUDENT', usn: 'USN008', semester: '5', section: 'A', active: true },
  { id: 'st-009', name: 'Ishaan Nair', email: 'ishaan.nair@demo.college.edu', role: 'STUDENT', usn: 'USN009', semester: '5', section: 'A', active: true },
  { id: 'st-010', name: 'Janhavi Kulkarni', email: 'janhavi.k@demo.college.edu', role: 'STUDENT', usn: 'USN010', semester: '5', section: 'A', active: true },
  { id: 'st-011', name: 'Kiran Gowda', email: 'kiran.gowda@demo.college.edu', role: 'STUDENT', usn: 'USN011', semester: '5', section: 'A', active: true },
  { id: 'st-012', name: 'Lavanya Pai', email: 'lavanya.pai@demo.college.edu', role: 'STUDENT', usn: 'USN012', semester: '5', section: 'A', active: true },
  { id: 'st-013', name: 'Manoj Deshmukh', email: 'manoj.d@demo.college.edu', role: 'STUDENT', usn: 'USN013', semester: '5', section: 'A', active: true },
  { id: 'st-014', name: 'Neha Sharma', email: 'neha.sharma@demo.college.edu', role: 'STUDENT', usn: 'USN014', semester: '5', section: 'A', active: true },
  { id: 'st-015', name: 'Omkar Hegde', email: 'omkar.hegde@demo.college.edu', role: 'STUDENT', usn: 'USN015', semester: '5', section: 'A', active: true },
  { id: 'st-016', name: 'Pooja Reddy', email: 'pooja.reddy@demo.college.edu', role: 'STUDENT', usn: 'USN016', semester: '5', section: 'A', active: true },
  { id: 'st-017', name: 'Rahul Varma', email: 'rahul.varma@demo.college.edu', role: 'STUDENT', usn: 'USN017', semester: '5', section: 'A', active: true },
];

const initialAdmin: Profile = {
  id: 'admin-001',
  name: 'Prof. Ramesh Sharma (Admin)',
  email: 'admin@college.edu',
  role: 'ADMIN',
  usn: null,
  semester: null,
  section: null,
  active: true,
};

const initialLocations: AttendanceLocation[] = [
  {
    id: 'loc-001',
    name: 'Electronics Classroom 302',
    latitude: 15.364700,
    longitude: 75.124000,
    radius_meters: 50,
    max_accuracy_meters: 100,
    active: true,
  },
  {
    id: 'loc-002',
    name: 'Digital Systems Laboratory',
    latitude: 15.365000,
    longitude: 75.124500,
    radius_meters: 40,
    max_accuracy_meters: 100,
    active: true,
  },
  {
    id: 'loc-003',
    name: 'Central Seminar Hall A',
    latitude: 15.364000,
    longitude: 75.123500,
    radius_meters: 60,
    max_accuracy_meters: 100,
    active: true,
  },
  {
    id: 'loc-004',
    name: 'Embedded IoT Project Lab',
    latitude: 15.365500,
    longitude: 75.125000,
    radius_meters: 45,
    max_accuracy_meters: 100,
    active: true,
  },
];

// Helper to get today's ISO dates for sample active session
const now = new Date();
const todayDateStr = now.toISOString().split('T')[0];
const sessionStart = new Date(now.getTime() - 20 * 60 * 1000).toISOString();
const sessionLate = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
const sessionEnd = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

const initialSessions: AttendanceSession[] = [
  {
    id: 'sess-active-01',
    subject: 'Digital Electronics',
    class_name: '5th Sem ECE - Sec A',
    attendance_date: todayDateStr,
    location_id: 'loc-001',
    start_time: sessionStart,
    end_time: sessionEnd,
    late_threshold: sessionLate,
    status: 'ACTIVE',
    created_by: 'admin-001',
    created_at: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'sess-past-01',
    subject: 'Microcontrollers & Embedded Systems',
    class_name: '5th Sem ECE - Sec A',
    attendance_date: new Date(now.getTime() - 86400000).toISOString().split('T')[0],
    location_id: 'loc-002',
    start_time: new Date(now.getTime() - 86400000).toISOString(),
    end_time: new Date(now.getTime() - 86400000 + 3600000).toISOString(),
    late_threshold: new Date(now.getTime() - 86400000 + 900000).toISOString(),
    status: 'CLOSED',
    created_by: 'admin-001',
    created_at: new Date(now.getTime() - 86400000).toISOString(),
  },
];

// Initial attendance records for past and active session
const initialRecords: AttendanceRecord[] = [
  // Active session records (students who have already marked)
  {
    id: 'rec-001',
    session_id: 'sess-active-01',
    student_id: 'st-001',
    marked_at: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
    student_latitude: 15.364710,
    student_longitude: 75.124010,
    gps_accuracy_meters: 12,
    distance_from_location_meters: 1.4,
    location_verified: true,
    status: 'PRESENT',
    verification_message: 'Verified within 50m radius (1.4m away)',
  },
  {
    id: 'rec-002',
    session_id: 'sess-active-01',
    student_id: 'st-002',
    marked_at: new Date(now.getTime() - 14 * 60 * 1000).toISOString(),
    student_latitude: 15.364850,
    student_longitude: 75.124100,
    gps_accuracy_meters: 15,
    distance_from_location_meters: 19.8,
    location_verified: true,
    status: 'PRESENT',
    verification_message: 'Verified within 50m radius (19.8m away)',
  },
  {
    id: 'rec-003',
    session_id: 'sess-active-01',
    student_id: 'st-003',
    marked_at: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
    student_latitude: 15.364900,
    student_longitude: 75.124200,
    gps_accuracy_meters: 22,
    distance_from_location_meters: 31.2,
    location_verified: true,
    status: 'PRESENT',
    verification_message: 'Verified within 50m radius (31.2m away)',
  },
  // Past session records
  ...initialStudents.slice(0, 14).map((st, i) => ({
    id: `rec-past-${i}`,
    session_id: 'sess-past-01',
    student_id: st.id,
    marked_at: new Date(now.getTime() - 86400000 + (i * 60000)).toISOString(),
    student_latitude: 15.365010,
    student_longitude: 75.124510,
    gps_accuracy_meters: 10 + (i % 5),
    distance_from_location_meters: 5 + (i * 2),
    location_verified: true,
    status: (i === 12 || i === 13 ? 'LATE' : 'PRESENT') as 'LATE' | 'PRESENT',
    verification_message: 'Verified',
  })),
];

const initialAuditLogs: AuditLog[] = [
  {
    id: 'log-001',
    user_id: 'admin-001',
    action: 'SESSION_STARTED',
    entity_type: 'attendance_session',
    entity_id: 'sess-active-01',
    metadata: { subject: 'Digital Electronics', location: 'Electronics Classroom 302' },
    created_at: new Date(now.getTime() - 25 * 60 * 1000).toISOString(),
  },
  {
    id: 'log-002',
    user_id: 'st-001',
    action: 'ATTENDANCE_MARKED',
    entity_type: 'attendance_record',
    entity_id: 'rec-001',
    metadata: { distanceMeters: 1.4, status: 'PRESENT' },
    created_at: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
  },
];

// Attach to globalThis to preserve in-memory state across Next.js dev server reloads
declare global {
  // eslint-disable-next-line no-var
  var __ATTENDANCE_MOCK_STORE__: GlobalStore | undefined;
}

if (!globalThis.__ATTENDANCE_MOCK_STORE__) {
  globalThis.__ATTENDANCE_MOCK_STORE__ = {
    profiles: [initialAdmin, ...initialStudents],
    locations: initialLocations,
    sessions: initialSessions,
    records: initialRecords,
    auditLogs: initialAuditLogs,
  };
}

export const mockStore = globalThis.__ATTENDANCE_MOCK_STORE__;

export function isUsingMockData(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !url || url.includes('your-project-id') || url.includes('demo-attendance-app');
}
