export type Role =
  | "SUPERADMIN"
  | "ADMIN"
  | "DOCTOR"
  | "TEACHING_ASSISTANT"
  | "STUDENT";
export type UserRole = Role;

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  organization_id: number | null;
  is_active: boolean;
}
export type AuthUser = User;
export interface AuthTokens {
  access: string;
  refresh: string;
}
export interface LoginResponse extends AuthTokens {
  user: User;
}

export interface AcademicYear {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}
export interface Semester {
  id: number;
  academic_year: number;
  academic_year_name: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}
export interface Course {
  id: number;
  code: string;
  name: string;
  department: string;
  created_at: string;
}
export interface CourseOffering {
  id: number;
  course: number;
  course_code: string;
  course_name: string;
  academic_year: number;
  academic_year_name: string;
  semester: number;
  semester_name: string;
  doctor: number | null;
  doctor_name: string | null;
  status: "ACTIVE" | "ARCHIVED";
  created_at: string;
}
export interface Group {
  id: number;
  course_offering: number;
  course_code: string;
  name: string;
  teaching_assistant: number | null;
  ta_name: string | null;
  status: "ACTIVE" | "ARCHIVED";
  student_count: number;
  created_at: string;
}
export type SessionType = "LECTURE" | "LAB" | "TUTORIAL";
export interface Schedule {
  id: number;
  course_offering: number;
  course_code: string;
  group: number | null;
  group_name: string | null;
  session_type: SessionType;
  location: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  effective_from: string | null;
  effective_until: string | null;
  is_active: boolean;
  created_at: string;
}
export interface SessionOccurrence {
  id: number;
  schedule_id: number;
  course_offering_id: number;
  course_code: string;
  course_name: string;
  group_id: number | null;
  group_name: string | null;
  scheduled_date: string;
  starts_at: string;
  ends_at: string;
  session_type: SessionType;
  status: "SCHEDULED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
}
export type SessionStatus = "SCHEDULED" | "ACTIVE" | "CLOSED" | "EXPIRED";
export interface AttendanceSession {
  id: number;
  occurrence_id: number;
  course_offering_id?: number;
  group_id?: number | null;
  course_code: string;
  course_name: string;
  group_name: string | null;
  session_type: SessionType;
  occurrence_type?: "SCHEDULED" | "AD_HOC";
  opened_by?: number;
  opened_by_name?: string;
  opened_at?: string;
  latitude: number | null;
  longitude: number | null;
  location_accuracy_meters?: number | null;
  location_captured_at?: string | null;
  radius_meters: number;
  max_location_accuracy_meters: number;
  late_after_minutes: number;
  status: SessionStatus;
  starts_at: string;
  expires_at: string;
  closed_at: string | null;
  created_at: string;
}
export type AttendanceStatus = "PRESENT" | "LATE" | "EXCUSED" | "CHEATING";
export interface AttendanceRecord {
  id: number;
  session_id: number;
  student_id: string;
  student_name: string;
  course_code: string;
  status: AttendanceStatus;
  verified_at: string;
  submitted_latitude: number | null;
  submitted_longitude: number | null;
  location_accuracy_meters: number | null;
  distance_from_location_meters: number | null;
  mock_location_detected: boolean;
  device_challenge_verified: boolean;
}
export interface Student {
  id: number;
  student_id: string;
  email: string;
  personal_email: string | null;
  first_name: string;
  last_name: string;
  phone: string;
  status: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  is_active: boolean;
  created_at: string;
}
export interface StudentEnrollment {
  id: number;
  student: number;
  course_offering: number;
  group: number | null;
}
export interface Device {
  id: number;
  device_fingerprint: string;
  platform: "android" | "ios" | "unknown";
  device_name: string;
  os_version: string;
  status: "ACTIVE" | "REVOKED";
  registered_at: string;
  last_seen_at: string | null;
  biometric_invalidated: boolean;
  /** False when the device registered without biometric hardware or enrolled biometrics. */
  biometric_enrolled: boolean;
}
export interface DeviceRegistration {
  device_fingerprint: string;
  public_key: string;
  platform: Device["platform"];
  device_name?: string;
  os_version?: string;
  /** True when the device had active biometric hardware at registration time. */
  biometric_enrolled: boolean;
}
export interface TodaySection {
  group_id: number;
  group_name: string;
  ta_name: string;
}
export interface TodayWork {
  occurrence_id?: number;
  schedule_id?: number;
  course_offering_id?: number;
  course_code: string;
  course_name: string;
  group_id?: number | null;
  group_name: string | null;
  session_type: SessionType;
  occurrence_type?: "SCHEDULED" | "AD_HOC";
  scheduled_date?: string;
  starts_at: string;
  ends_at?: string;
  expires_at?: string;
  session_id: number | null;
  session_status?: SessionStatus;
  can_open?: boolean;
  can_close?: boolean;
  sections?: TodaySection[];
  radius_meters?: number;
  latitude?: number | null;
  longitude?: number | null;
  has_checked_in?: boolean;
}
export interface OpenOccurrencePayload {
  latitude?: number | null;
  longitude?: number | null;
  location_accuracy_meters?: number | null;
  accuracy_m?: number | null;
  location_captured_at?: string | null;
  captured_at?: string | null;
  duration_minutes?: number;
  late_after_minutes?: number;
  radius_meters?: number | null;
}
export interface AdHocSessionStartPayload {
  course_offering_id: number;
  group_id?: number | null;
  session_type: SessionType;
  latitude: number;
  longitude: number;
  accuracy_m?: number;
  location_accuracy_meters?: number;
  location_captured_at?: string;
  captured_at?: string;
  duration_minutes?: number;
  late_after_minutes?: number;
  radius_meters?: number | null;
}
export interface ManualCorrection {
  student_id: number;
  status?: AttendanceStatus;
  reason?: string;
}
export interface Challenge {
  challenge_token: string;
  expires_at: string;
}
export interface CheckInPayload {
  device_id: number;
  challenge_token: string;
  signature: string;
  latitude?: number | null;
  longitude?: number | null;
  location_accuracy?: number | null;
  location_timestamp?: number | null;
  mock_location?: boolean;
}
export type AttendanceResult = AttendanceRecord;
export type ApiErrorCode =
  | "SESSION_ALREADY_OPEN"
  | "SESSION_ALREADY_CLOSED"
  | "SESSION_EXPIRED"
  | "SESSION_NOT_SCHEDULED"
  | "SESSION_SCHEDULE_EXCEPTION"
  | "COURSE_NOT_OWNED"
  | "GROUP_NOT_ASSIGNED"
  | "LECTURE_NOT_ALLOWED"
  | "UNAUTHORIZED_SESSION_OPENER"
  | "SESSION_LOCATION_REQUIRED"
  | "SESSION_LOCATION_INVALID"
  | "SESSION_LOCATION_STALE"
  | "SESSION_LOCATION_ACCURACY_INVALID"
  | "COURSE_NOT_IN_SCOPE"
  | "GROUP_NOT_IN_SCOPE"
  | "INVALID_SESSION_TYPE"
  | "OCCURRENCE_ALREADY_ACTIVE"
  | "AD_HOC_SESSION_NOT_ALLOWED"
  | "SESSION_LOCATION_IMMUTABLE"
  | "DEVICE_REGISTRATION_LOCKED_ACTIVE_SESSION"
  | "DEVICE_NOT_ACTIVE"
  | "ATTENDANCE_NOT_ELIGIBLE"
  | "DUPLICATE_ATTENDANCE"
  | "MANUAL_CORRECTION_NOT_ALLOWED"
  | "INVALID_ACADEMIC_SCOPE"
  | "DEVICE_NOT_FOUND"
  | "DEVICE_NOT_AUTHORIZED"
  | "BIOMETRIC_INVALIDATED"
  | "CHALLENGE_INVALID"
  | "CHALLENGE_EXPIRED"
  | "SIGNATURE_INVALID"
  | "ORG_MISMATCH"
  | "STUDENT_INACTIVE"
  | "ENROLLMENT_MISMATCH"
  | "SESSION_NOT_ACTIVE"
  | "LOCATION_REQUIRED"
  | "INVALID_COORDINATES"
  | "STALE_LOCATION"
  | "POOR_ACCURACY"
  | "OUTSIDE_RADIUS"
  | "SESSION_NOT_FOUND";
export interface Doctor {
  id: number;
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
  department: string;
  title: string;
  created_at: string;
}
export interface TeachingAssistant {
  id: number;
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
  department: string;
  created_at: string;
}
