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
