import { api } from "./client";
import type { AuditLog, Paginated } from "./types";

export const auditApi = {
  list: (
    params: {
      page?: number;
      page_size?: number;
      entity_type?: string;
      action?: string;
    } = {},
  ) => api.get<Paginated<AuditLog>>("/audit/logs", { params }).then((r) => r.data),
};
