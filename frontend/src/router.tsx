import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Shell } from "@/components/layout/Shell";
import LoginPage from "@/pages/Login";
import DashboardPage from "@/pages/Dashboard";
import Placeholder from "@/pages/Placeholder";

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
          { path: "/organizations", ...placeholder("Организации", "на этапе 2") },
          { path: "/departments", ...placeholder("Отделы", "на этапе 2") },
          { path: "/branches", ...placeholder("Филиалы", "на этапе 2") },
          { path: "/devices", ...placeholder("Устройства", "на этапе 3") },
          { path: "/employees", ...placeholder("Сотрудники", "на этапе 3") },
          { path: "/schedules", ...placeholder("Расписания", "на этапе 4") },
          { path: "/attendance", ...placeholder("Приход/уход", "на этапе 4") },
          { path: "/reports", ...placeholder("Отчёты", "на этапе 5") },
          { path: "/integrations", ...placeholder("Интеграции", "на этапе 6") },
          { path: "/users", ...placeholder("Пользователи системы", "на этапе 2") },
          { path: "/audit", ...placeholder("Логи действий", "на этапе 2") },
          { path: "/settings", ...placeholder("Настройки", "на этапе 7") },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
