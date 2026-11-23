export type UserRole = 'ADMIN' | 'STUDENT';

export interface Semester {
  id: string;
  name: string;
  semester_number: number; // 1 to 8
  academic_year: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Section {
  id: string;
  name: string;
  semester_id: string;
  active: boolean;
  created_at?: string;
  semester?: Semester;
}

export interface Course {
  id: string;
  course_code: string;
  course_name: string;
  semester_id: string;
  description?: string | null;
  active: boolean;
  created_at?: string;
  updated_at?: string;
  semester?: Semester;
}

export interface StudentCourse {
  id: string;
  student_id: string;
  course_id: string;
  created_at?: string;
  course?: Course;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  usn?: string | null;
  semester?: string | null;
  section?: string | null;
  semester_id?: string | null;
  section_id?: string | null;
  photo_url?: string | null;
  password?: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
  semester_info?: Semester | null;
  section_info?: Section | null;
  enrolled_courses?: Course[];
}

export interface AttendanceLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  max_accuracy_meters: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type SessionStatus = 'SCHEDULED' | 'ACTIVE' | 'CLOSED' | 'EXPIRED' | 'CANCELLED';

export interface AttendanceSession {
  id: string;
  subject: string;
  class_name: string;
  semester_id?: string | null;
  course_id?: string | null;
  section_id?: string | null;
  attendance_date: string;
  attendance_day?: string;
  session_description?: string | null;
  location_id: string;
  start_time: string;
  end_time: string;
  late_threshold: string;
  gps_radius?: number;
  status: SessionStatus;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  location?: AttendanceLocation;
  semester?: Semester;
  course?: Course;
  section?: Section;
}

export type AttendanceStatus =
  | 'PRESENT'
  | 'LATE'
  | 'ABSENT'
  | 'NOT_MARKED'
  | 'REJECTED_LOCATION'
  | 'REJECTED_TIME';

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  marked_at: string;
  student_latitude?: number | null;
  student_longitude?: number | null;
  gps_accuracy_meters?: number | null;
  distance_from_location_meters?: number | null;
  location_verified: boolean;
  status: AttendanceStatus;
  verification_message?: string | null;
  created_at?: string;
  updated_at?: string;
  student?: Profile;
  session?: AttendanceSession;
}

export type AuditAction =
  | 'SESSION_CREATED'
  | 'SESSION_STARTED'
  | 'SESSION_CLOSED'
  | 'SESSION_CANCELLED'
  | 'ATTENDANCE_MARKED'
  | 'ATTENDANCE_REJECTED'
  | 'ATTENDANCE_MANUALLY_CHANGED'
  | 'LOCATION_CREATED'
  | 'LOCATION_UPDATED'
  | 'STUDENT_CREATED'
  | 'STUDENT_UPDATED'
  | 'SEMESTER_CREATED'
  | 'SEMESTER_UPDATED'
  | 'COURSE_CREATED'
  | 'COURSE_UPDATED'
  | 'SECTION_CREATED'
  | 'SECTION_UPDATED'
  | 'STUDENT_COURSE_ENROLLED';

export interface AuditLog {
  id: string;
  user_id?: string | null;
  action: AuditAction | string;
  entity_type: string;
  entity_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
}

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface AttendanceVerificationRequest {
  sessionId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface AttendanceVerificationResponse {
  success: boolean;
  status: AttendanceStatus;
  message?: string;
  markedAt?: string;
  distanceMeters?: number;
  allowedRadiusMeters?: number;
  locationVerified?: boolean;
  accuracy?: number;
  courseName?: string;
  locationName?: string;
}

export interface StudentStats {
  totalConducted: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  attendancePercentage: number;
}
