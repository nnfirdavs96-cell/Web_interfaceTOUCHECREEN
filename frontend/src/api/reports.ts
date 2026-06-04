import { api } from "./client";
import { useAuthStore } from "@/stores/auth";

export interface TimesheetRow {
  external_id: string;
  full_name: string;
  date: string;
  required_check_in: string | null;
  actual_check_in: string | null;
  required_check_out: string | null;
  actual_check_out: string | null;
  late_minutes: number;
  early_leave_minutes: number;
  worked_minutes: number;
  status: string;
}

export interface TimesheetResponse {
  date_from: string;
  date_to: string;
  rows: TimesheetRow[];
}

export interface ReportFilters {
  date_from?: string;
  date_to?: string;
  employee_id?: string;
  department_id?: string;
  branch_id?: string;
  organization_id?: string;
  status?: string;
}

export const reportsApi = {
  timesheet: (params: ReportFilters = {}) =>
    api.get<TimesheetResponse>("/reports/timesheet", { params }).then((r) => r.data),
  summary: (params: ReportFilters = {}) =>
    api.get<{ total_rows: number; by_status: Record<string, number> }>("/reports/summary", { params }).then((r) => r.data),
  downloadUrl: (fmt: "csv" | "excel" | "pdf", params: ReportFilters = {}) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v) search.set(k, String(v));
    });
    const token = useAuthStore.getState().accessToken;
    if (token) search.set("__t", token);
    return `/api/v1/reports/export/${fmt}?${search.toString()}`;
  },
  download: async (fmt: "csv" | "excel" | "pdf", params: ReportFilters = {}) => {
    const res = await api.get(`/reports/export/${fmt}`, {
      params,
      responseType: "blob",
    });
    const disposition = res.headers["content-disposition"] || "";
    const m = /filename="?([^"]+)"?/.exec(disposition);
    const name = m?.[1] ?? `report.${fmt === "excel" ? "xlsx" : fmt}`;
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
