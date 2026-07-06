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
import CamerasPage from "@/pages/cameras/CamerasPage";
import GatewaysPage from "@/pages/gateways/GatewaysPage";
import EmployeesPage from "@/pages/employees/EmployeesPage";
import EmployeeDetailPage from "@/pages/employees/EmployeeDetailPage";
import SchedulesPage from "@/pages/schedules/SchedulesPage";
import AttendancePage from "@/pages/attendance/AttendancePage";
import ReportsPage from "@/pages/reports/ReportsPage";
import SettingsPage from "@/pages/settings/SettingsPage";

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
          { path: "/cameras", element: <CamerasPage /> },
          { path: "/gateways", element: <GatewaysPage /> },
          { path: "/employees", element: <EmployeesPage /> },
          { path: "/employees/:id", element: <EmployeeDetailPage /> },
          { path: "/schedules", element: <SchedulesPage /> },
          { path: "/attendance", element: <AttendancePage /> },
          { path: "/reports", element: <ReportsPage /> },
          { path: "/integrations", ...placeholder("Интеграции", "на этапе 6") },
          { path: "/users", element: <UsersPage /> },
          { path: "/audit", element: <AuditPage /> },
          { path: "/settings", element: <SettingsPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
