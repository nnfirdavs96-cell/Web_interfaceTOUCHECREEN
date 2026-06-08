import { api } from "./client";
import type { Device, DeviceTestResult, Paginated } from "./types";

export const devicesApi = {
  list: (params: { page?: number; page_size?: number; search?: string } = {}) =>
    api.get<Paginated<Device>>("/devices", { params }).then((r) => r.data),
  create: (data: Partial<Device> & { password: string }) =>
    api.post<Device>("/devices", data).then((r) => r.data),
  update: (id: string, data: Partial<Device> & { password?: string }) =>
    api.put<Device>(`/devices/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/devices/${id}`),
  test: (id: string) =>
    api.post<DeviceTestResult>(`/devices/${id}/test-connection`).then((r) => r.data),
  sync: (id: string) => api.post(`/devices/${id}/sync`),
  syncAllEmployees: (id: string) =>
    api
      .post<{ success: boolean; synced: number; failed: number; total: number; detail: string }>(
        `/devices/${id}/sync-all-employees`,
      )
      .then((r) => r.data),
  syncTime: (id: string) =>
    api.post<{ success: boolean; detail: string }>(`/devices/${id}/sync-time`).then((r) => r.data),
  snapshotUrl: (id: string, token: string, cacheKey?: number) =>
    `/api/v1/devices/${id}/snapshot?t=${encodeURIComponent(token)}${cacheKey ? `&_=${cacheKey}` : ""}`,
};
