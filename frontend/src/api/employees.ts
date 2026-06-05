import { api } from "./client";
import type { Employee, EmployeeAccess, Paginated } from "./types";

export interface Credential {
  id: string;
  type: string;
  value_ref: string | null;
  device_id: string | null;
  enrolled_at: string | null;
}

export interface EnrollResult {
  success: boolean;
  detail: string;
  value_ref: string | null;
}

export const employeesApi = {
  list: (
    params: {
      page?: number;
      page_size?: number;
      search?: string;
      organization_id?: string;
      department_id?: string;
      branch_id?: string;
      status?: string;
    } = {},
  ) => api.get<Paginated<Employee>>("/employees", { params }).then((r) => r.data),
  create: (data: Partial<Employee>) => api.post<Employee>("/employees", data).then((r) => r.data),
  get: (id: string) => api.get<Employee>(`/employees/${id}`).then((r) => r.data),
  update: (id: string, data: Partial<Employee>) =>
    api.put<Employee>(`/employees/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/employees/${id}`),
  access: (id: string) =>
    api.get<EmployeeAccess[]>(`/employees/${id}/access`).then((r) => r.data),
  assignDevices: (
    id: string,
    data: {
      device_ids: string[];
      access_level?: string;
      valid_from?: string | null;
      valid_to?: string | null;
    },
  ) => api.post<EmployeeAccess[]>(`/employees/${id}/assign-devices`, data).then((r) => r.data),
  credentials: (id: string) =>
    api.get<Credential[]>(`/employees/${id}/credentials`).then((r) => r.data),
  syncToDevice: (id: string, device_id: string) =>
    api
      .post<EnrollResult>(`/employees/${id}/sync-to-device`, { device_id })
      .then((r) => r.data),
  enrollFingerprint: (id: string, device_id: string, finger_no = 1) =>
    api
      .post<EnrollResult>(`/employees/${id}/enroll-fingerprint`, { device_id, finger_no })
      .then((r) => r.data),
  enrollFace: (id: string, device_id: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api
      .post<EnrollResult>(`/employees/${id}/enroll-face?device_id=${device_id}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
  addCard: (id: string, device_id: string, card_no: string) =>
    api
      .post<EnrollResult>(`/employees/${id}/add-card`, { device_id, card_no })
      .then((r) => r.data),
};
