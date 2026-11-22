import { Navigate, createBrowserRouter } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { CostCenterFormPage } from "./pages/CostCenterFormPage";
import { CostCentersPage } from "./pages/CostCentersPage";
import { EmployeeFormPage } from "./pages/EmployeeFormPage";
import { EmployeesPage } from "./pages/EmployeesPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { SiteFormPage } from "./pages/SiteFormPage";
import { SitesPage } from "./pages/SitesPage";
import { UserFormPage } from "./pages/UserFormPage";
import { UsersPage } from "./pages/UsersPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <HomePage />, handle: { title: "Dashboard" } },
      {
        path: "/assets",
        element: <PlaceholderPage />,
        handle: { title: "Assets & Anlagen" },
      },
      {
        path: "/maintenance-plans",
        element: <PlaceholderPage />,
        handle: { title: "Wartungspläne" },
      },
      {
        path: "/work-orders",
        element: <PlaceholderPage />,
        handle: { title: "Arbeitsaufträge" },
      },
      {
        path: "/spare-parts",
        element: <PlaceholderPage />,
        handle: { title: "Ersatzteillager" },
      },
      {
        path: "/reports",
        element: <PlaceholderPage />,
        handle: { title: "Berichte & Telemetrie" },
      },
      { path: "/sites", element: <SitesPage />, handle: { title: "Mandanten" } },
      {
        path: "/sites/new",
        element: <SiteFormPage />,
        handle: { title: "Mandant anlegen" },
      },
      {
        path: "/sites/:key/edit",
        element: <SiteFormPage />,
        handle: { title: "Mandant bearbeiten" },
      },
      {
        path: "/cost-centers",
        element: <CostCentersPage />,
        handle: { title: "Kostenstellen" },
      },
      {
        path: "/cost-centers/new",
        element: <CostCenterFormPage />,
        handle: { title: "Kostenstelle anlegen" },
      },
      {
        path: "/cost-centers/:key/edit",
        element: <CostCenterFormPage />,
        handle: { title: "Kostenstelle bearbeiten" },
      },
      {
        path: "/employees",
        element: <EmployeesPage />,
        handle: { title: "Mitarbeiter" },
      },
      {
        path: "/employees/new",
        element: <EmployeeFormPage />,
        handle: { title: "Mitarbeiter anlegen" },
      },
      {
        path: "/employees/:key/edit",
        element: <EmployeeFormPage />,
        handle: { title: "Mitarbeiter bearbeiten" },
      },
      { path: "/users", element: <UsersPage />, handle: { title: "Benutzer" } },
      {
        path: "/users/new",
        element: <UserFormPage />,
        handle: { title: "Benutzer anlegen" },
      },
      {
        path: "/users/:key/edit",
        element: <UserFormPage />,
        handle: { title: "Benutzer bearbeiten" },
      },
      {
        path: "/settings",
        element: <PlaceholderPage />,
        handle: { title: "Einstellungen" },
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
