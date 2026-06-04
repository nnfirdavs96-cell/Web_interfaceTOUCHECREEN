import { api } from "./client";
import type { Branch, Paginated } from "./types";

export const branchesApi = {
  list: (params: { page?: number; page_size?: number; search?: string } = {}) =>
    api.get<Paginated<Branch>>("/branches", { params }).then((r) => r.data),
  create: (data: Partial<Branch>) => api.post<Branch>("/branches", data).then((r) => r.data),
  update: (id: string, data: Partial<Branch>) =>
    api.put<Branch>(`/branches/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/branches/${id}`),
};
