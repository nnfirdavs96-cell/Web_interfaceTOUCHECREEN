import { api } from "./client";
import type { Camera, CameraStreamInfo, CameraTestResult, Paginated } from "./types";

export const camerasApi = {
  list: (params: { page?: number; page_size?: number; search?: string } = {}) =>
    api.get<Paginated<Camera>>("/cameras", { params }).then((r) => r.data),
  create: (data: Partial<Camera> & { password: string }) =>
    api.post<Camera>("/cameras", data).then((r) => r.data),
  update: (id: string, data: Partial<Camera> & { password?: string }) =>
    api.put<Camera>(`/cameras/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/cameras/${id}`),
  test: (id: string) =>
    api.post<CameraTestResult>(`/cameras/${id}/test-connection`).then((r) => r.data),
  stream: (id: string) =>
    api.get<CameraStreamInfo>(`/cameras/${id}/stream`).then((r) => r.data),
  snapshotUrl: (id: string, token: string, cacheKey?: number) =>
    `/api/v1/cameras/${id}/snapshot?t=${encodeURIComponent(token)}${cacheKey ? `&_=${cacheKey}` : ""}`,
};
