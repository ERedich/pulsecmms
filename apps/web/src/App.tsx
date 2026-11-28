import { Navigate, createBrowserRouter } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { AssetFormPage } from "./pages/AssetFormPage";
import { AssetsPage } from "./pages/AssetsPage";
import { AssetTreePage } from "./pages/AssetTreePage";
import { CostCenterFormPage } from "./pages/CostCenterFormPage";
import { CostCentersPage } from "./pages/CostCentersPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { EmployeeFormPage } from "./pages/EmployeeFormPage";
import { EmployeesPage } from "./pages/EmployeesPage";
import { LoginPage } from "./pages/LoginPage";
import { SettingFormPage } from "./pages/SettingFormPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SiteFormPage } from "./pages/SiteFormPage";
import { SitesPage } from "./pages/SitesPage";
import { UserFormPage } from "./pages/UserFormPage";
import { UsersPage } from "./pages/UsersPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <Navigate to="/sites" replace /> },
      { path: "/sites", element: <SitesPage /> },
      { path: "/sites/new", element: <SiteFormPage /> },
      { path: "/sites/:key/edit", element: <SiteFormPage /> },
      { path: "/cost-centers", element: <CostCentersPage /> },
      { path: "/cost-centers/new", element: <CostCenterFormPage /> },
      { path: "/cost-centers/:key/edit", element: <CostCenterFormPage /> },
      { path: "/assets", element: <AssetsPage /> },
      { path: "/assets/new", element: <AssetFormPage /> },
      { path: "/assets/:key/edit", element: <AssetFormPage /> },
      { path: "/asset-tree", element: <AssetTreePage /> },
      { path: "/documents", element: <DocumentsPage /> },
      { path: "/documents/assets/:key", element: <DocumentsPage /> },
      { path: "/employees", element: <EmployeesPage /> },
      { path: "/employees/new", element: <EmployeeFormPage /> },
      { path: "/employees/:key/edit", element: <EmployeeFormPage /> },
      { path: "/users", element: <UsersPage /> },
      { path: "/users/new", element: <UserFormPage /> },
      { path: "/users/:key/edit", element: <UserFormPage /> },
      { path: "/settings", element: <SettingsPage /> },
      { path: "/settings/:key/edit", element: <SettingFormPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/sites" replace /> },
]);
