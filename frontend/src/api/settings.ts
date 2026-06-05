import { api } from "./client";

export interface SystemSettings {
  project_name: string;
  version: string;
  env: string;
  debug: boolean;
  hikvision_mode: string;
  access_token_ttl_minutes: number;
  refresh_token_ttl_days: number;
  cors_origins: string[];
  demo_seed_enabled: boolean;
}

export const settingsApi = {
  get: () => api.get<SystemSettings>("/settings").then((r) => r.data),
};
