import { api } from "./client";
import type { Gateway, GatewayCreated, Paginated } from "./types";

export const gatewaysApi = {
  list: (params: { page?: number; page_size?: number; search?: string } = {}) =>
    api.get<Paginated<Gateway>>("/gateways", { params }).then((r) => r.data),
  create: (data: Partial<Gateway>) =>
    api.post<GatewayCreated>("/gateways", data).then((r) => r.data),
  update: (id: string, data: Partial<Gateway>) =>
    api.put<Gateway>(`/gateways/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/gateways/${id}`),
  regenerateToken: (id: string) =>
    api.post<GatewayCreated>(`/gateways/${id}/regenerate-token`).then((r) => r.data),
};
