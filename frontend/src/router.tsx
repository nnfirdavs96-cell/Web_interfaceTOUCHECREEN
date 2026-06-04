import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Shell } from "@/components/layout/Shell";
import LoginPage from "@/pages/Login";
import DashboardPage from "@/pages/Dashboard";
import Placeholder from "@/pages/Placeholder";
import OrganizationsPage from "@/pages/organizations/OrganizationsPage";
import DepartmentsPage from "@/pages/departments/DepartmentsPage";
import BranchesPage from "@/pages/branches/BranchesPage";
import UsersPage from "@/pages/users/UsersPage";
import AuditPage from "@/pages/audit/AuditPage";
import DevicesPage from "@/pages/devices/DevicesPage";
import EmployeesPage from "@/pages/employees/EmployeesPage";

const placeholder = (title: string, stage?: string) => ({
  element: <Placeholder title={title} stage={stage} />,
});

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Shell />,
        children: [
          { path: "/", element: <DashboardPage /> },
          { path: "/organizations", element: <OrganizationsPage /> },
          { path: "/departments", element: <DepartmentsPage /> },
          { path: "/branches", element: <BranchesPage /> },
          { path: "/devices", element: <DevicesPage /> },
          { path: "/employees", element: <EmployeesPage /> },
          { path: "/schedules", ...placeholder("Расписания", "на этапе 4") },
          { path: "/attendance", ...placeholder("Приход/уход", "на этапе 4") },
          { path: "/reports", ...placeholder("Отчёты", "на этапе 5") },
          { path: "/integrations", ...placeholder("Интеграции", "на этапе 6") },
          { path: "/users", element: <UsersPage /> },
          { path: "/audit", element: <AuditPage /> },
          { path: "/settings", ...placeholder("Настройки", "на этапе 7") },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
