import { api } from "./client";
import type { AttendanceEvent, AttendanceReport, Paginated } from "./types";

export const attendanceApi = {
  events: (params: {
    page?: number;
    page_size?: number;
    employee_id?: string;
    device_id?: string;
    date_from?: string;
    date_to?: string;
  } = {}) =>
    api.get<Paginated<AttendanceEvent>>("/attendance/events", { params }).then((r) => r.data),
  reports: (params: {
    page?: number;
    page_size?: number;
    employee_id?: string;
    date_from?: string;
    date_to?: string;
    status?: string;
  } = {}) =>
    api.get<Paginated<AttendanceReport>>("/attendance/reports", { params }).then((r) => r.data),
  fetchNow: () => api.post<{ saved: number }>("/attendance/fetch-events").then((r) => r.data),
  recalculate: (date_from?: string, date_to?: string) =>
    api
      .post<{ processed: number }>("/attendance/recalculate", null, {
        params: { date_from, date_to },
      })
      .then((r) => r.data),
};
