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
  name: string;
  type: string;
  ip: string;
  port: number;
  username: string;
  serial_number: string | null;
  firmware: string | null;
  online: boolean;
  last_seen_at: string | null;
  purpose: string;
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
