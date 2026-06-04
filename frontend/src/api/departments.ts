import { api } from "./client";
import type { Department } from "./types";

export const depsApi = {
  list: (organization_id?: string) =>
    api
      .get<Department[]>("/departments", {
        params: organization_id ? { organization_id } : undefined,
      })
      .then((r) => r.data),
  create: (data: Partial<Department>) =>
    api.post<Department>("/departments", data).then((r) => r.data),
  update: (id: string, data: Partial<Department>) =>
    api.put<Department>(`/departments/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/departments/${id}`),
};
