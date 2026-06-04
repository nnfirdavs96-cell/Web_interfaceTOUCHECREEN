import { api } from "./client";
import type { Organization, Paginated } from "./types";

export const orgsApi = {
  list: (params: { page?: number; page_size?: number; search?: string } = {}) =>
    api.get<Paginated<Organization>>("/organizations", { params }).then((r) => r.data),
  create: (data: Partial<Organization>) =>
    api.post<Organization>("/organizations", data).then((r) => r.data),
  update: (id: string, data: Partial<Organization>) =>
    api.put<Organization>(`/organizations/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/organizations/${id}`),
};
