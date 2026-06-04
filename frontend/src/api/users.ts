import { api } from "./client";
import type { Paginated, RoleInfo, SystemUser } from "./types";

export const usersApi = {
  list: (params: { page?: number; page_size?: number; search?: string } = {}) =>
    api.get<Paginated<SystemUser>>("/users", { params }).then((r) => r.data),
  create: (data: {
    email: string;
    password: string;
    full_name: string;
    role: string;
    is_active: boolean;
  }) => api.post<SystemUser>("/users", data).then((r) => r.data),
  update: (
    id: string,
    data: Partial<{
      full_name: string;
      role: string;
      is_active: boolean;
      password: string;
    }>,
  ) => api.put<SystemUser>(`/users/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/users/${id}`),
  roles: () => api.get<RoleInfo[]>("/users/roles").then((r) => r.data),
};
