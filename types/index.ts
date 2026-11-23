export type UserRole = 'ADMIN' | 'STUDENT';

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  usn?: string | null;
  semester?: string | null;
  section?: string | null;
  photo_url?: string | null;
  password?: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
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

export type SessionStatus = 'SCHEDULED' | 'ACTIVE' | 'CLOSED' | 'EXPIRED';

export interface AttendanceSession {
  id: string;
  subject: string;
  class_name: string;
  attendance_date: string;
  location_id: string;
  start_time: string;
  end_time: string;
  late_threshold: string;
  status: SessionStatus;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  location?: AttendanceLocation;
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
  | 'ATTENDANCE_MARKED'
  | 'ATTENDANCE_REJECTED'
  | 'ATTENDANCE_MANUALLY_CHANGED'
  | 'LOCATION_CREATED'
  | 'LOCATION_UPDATED'
  | 'STUDENT_CREATED'
  | 'STUDENT_UPDATED';

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
}

export interface StudentStats {
  totalConducted: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  attendancePercentage: number;
}
