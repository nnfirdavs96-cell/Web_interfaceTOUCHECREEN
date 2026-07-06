export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface Organization {
  id: string;
  name: string;
  inn?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  responsible_person?: string | null;
  comment?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  organization_id: string;
  parent_id?: string | null;
  name: string;
  comment?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  organization_id: string;
  name: string;
  address?: string | null;
  responsible?: string | null;
  phone?: string | null;
  working_hours?: string | null;
  comment?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SystemUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  organization_id: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface RoleInfo {
  code: string;
  name: string;
}

export interface Device {
  id: string;
  branch_id: string | null;
  organization_id: string | null;
  name: string;
  vendor: string;
  type: string;
  ip: string;
  port: number;
  username: string;
  serial_number: string | null;
  firmware: string | null;
  online: boolean;
  last_seen_at: string | null;
  purpose: string;
  timezone_offset: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeviceTestResult {
  online: boolean;
  detail: string;
  serial_number: string | null;
  firmware: string | null;
}

export interface Camera {
  id: string;
  branch_id: string | null;
  organization_id: string | null;
  linked_device_id: string | null;
  name: string;
  vendor: string;
  ip: string;
  port: number;
  username: string;
  rtsp_url: string | null;
  model: string | null;
  online: boolean;
  last_seen_at: string | null;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface CameraTestResult {
  online: boolean;
  detail: string;
  model: string | null;
}

export interface CameraStreamInfo {
  stream_url: string | null;
  hls_url: string | null;
  webrtc_url: string | null;
  live: boolean;
  detail: string;
}

export interface Employee {
  id: string;
  external_id: string | null;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  phone: string | null;
  email: string | null;
  organization_id: string | null;
  department_id: string | null;
  branch_id: string | null;
  position: string | null;
  photo_url: string | null;
  status: string;
  hired_at: string | null;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeAccess {
  id: string;
  device_id: string;
  access_level: string;
  valid_from: string | null;
  valid_to: string | null;
  synced_at: string | null;
}

export interface ScheduleDay {
  id?: string;
  weekday: number;
  is_workday: boolean;
  start_time: string | null;
  end_time: string | null;
  shift_no: number;
}

export interface Schedule {
  id: string;
  name: string;
  type: string;
  allowed_late_minutes: number;
  allowed_early_leave_minutes: number;
  night_shift: boolean;
  lunch_start: string | null;
  lunch_end: string | null;
  comment: string | null;
  days: ScheduleDay[];
  created_at: string;
  updated_at: string;
}

export interface AttendanceEvent {
  id: string;
  employee_id: string | null;
  device_id: string | null;
  external_user_id: string | null;
  event_time: string;
  event_type: string;
  success: boolean;
}

export interface AttendanceReport {
  id: string;
  employee_id: string;
  date: string;
  required_check_in: string | null;
  actual_check_in: string | null;
  required_check_out: string | null;
  actual_check_out: string | null;
  late_minutes: number;
  early_leave_minutes: number;
  worked_minutes: number;
  status: string;
  device_in_id: string | null;
  device_out_id: string | null;
}

export interface DashboardKpis {
  total_employees: number;
  total_devices: number;
  online_devices: number;
  came_today: number;
  late_today: number;
  absent_today: number;
}

export interface DashboardData {
  kpis: DashboardKpis;
  weekly: { date: string; came: number; late: number }[];
  recent_events: AttendanceEvent[];
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}
