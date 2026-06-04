import { api } from "./client";
import type { Schedule, ScheduleDay } from "./types";

export interface ScheduleInput {
  name: string;
  type?: string;
  allowed_late_minutes?: number;
  allowed_early_leave_minutes?: number;
  night_shift?: boolean;
  lunch_start?: string | null;
  lunch_end?: string | null;
  comment?: string | null;
  days?: ScheduleDay[];
}

export const schedulesApi = {
  list: () => api.get<Schedule[]>("/schedules").then((r) => r.data),
  create: (data: ScheduleInput) => api.post<Schedule>("/schedules", data).then((r) => r.data),
  update: (id: string, data: ScheduleInput) =>
    api.put<Schedule>(`/schedules/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/schedules/${id}`),
  assign: (id: string, data: { target_type: string; target_ids: string[] }) =>
    api.post(`/schedules/${id}/assign`, data),
};
