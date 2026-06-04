import { api } from "./client";
import type { Employee, EmployeeAccess, Paginated } from "./types";

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
};
