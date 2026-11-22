import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import {
  AUTH_USER_UPDATED_EVENT,
  clearSession,
  getAccessToken,
  getStoredUser,
  type AuthUser,
} from "../../lib/auth";
import { GlobalSearchProvider } from "../../lib/globalSearch";
import { Sidebar } from "./Sidebar";
import { TopNavbar } from "./TopNavbar";

export function AppShell() {
  const token = getAccessToken();
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    function onUserUpdated() {
      setUser(getStoredUser());
    }
    window.addEventListener(AUTH_USER_UPDATED_EVENT, onUserUpdated);
    return () => {
      window.removeEventListener(AUTH_USER_UPDATED_EVENT, onUserUpdated);
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    function onChange() {
      if (media.matches) setSidebarOpen(false);
    }
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!sidebarOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSidebarOpen(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [sidebarOpen]);

  if (!token || !user) {
    clearSession();
    return <Navigate to="/login" replace />;
  }

  return (
    <GlobalSearchProvider>
      <div className="min-h-screen bg-background font-sans text-on-surface antialiased">
        {sidebarOpen ? (
          <button
            type="button"
            aria-label="Navigation schließen"
            className="fixed inset-0 z-[99] bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}

        <Sidebar
          user={user}
          open={sidebarOpen}
          onNavigate={() => setSidebarOpen(false)}
        />

        <div className="relative z-0 flex min-h-screen flex-col pl-0 lg:pl-72">
          <TopNavbar
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen((value) => !value)}
          />
          <main className="w-full flex-1 bg-background">
            <div className="w-full pb-20">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </GlobalSearchProvider>
  );
}
