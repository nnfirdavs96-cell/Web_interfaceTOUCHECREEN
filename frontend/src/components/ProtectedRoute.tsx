import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";

export function ProtectedRoute() {
  const token = useAuthStore((s) => s.accessToken);
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}
