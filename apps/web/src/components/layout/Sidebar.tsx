import {
  IconBell,
  IconBolt,
  IconLogout,
  IconSparkles,
} from "@tabler/icons-react";
import { NavLink, useNavigate } from "react-router-dom";
import type { AuthUser } from "../../lib/auth";
import { clearSession } from "../../lib/auth";
import { ThemeToggle } from "../ThemeToggle";
import { NAV_ITEMS } from "./nav";

type SidebarProps = {
  user: AuthUser;
  open: boolean;
  onNavigate?: () => void;
  onOpenAi?: () => void;
};

export function Sidebar({ user, open, onNavigate, onOpenAi }: SidebarProps) {
  const navigate = useNavigate();
  const displayName =
    `${user.firstName} ${user.lastName}`.trim() || user.loginName;
  const initials =
    `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.trim() ||
    user.loginName.charAt(0).toUpperCase();
  const roleLabel = user.primarySite.name;

  function logout() {
    clearSession();
    navigate("/login", { replace: true });
  }

  return (
    <aside
      id="app-sidebar"
      className={[
        "sidebar-shell fixed top-0 left-0 z-[100] flex h-full w-72 flex-col justify-between border-r border-outline-variant/70 bg-surface",
        "transition-[transform,translate] duration-200 ease-out motion-reduce:transition-none",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      ].join(" ")}
    >
      <div className="flex flex-col">
        <div className="flex h-16 items-center px-3">
          <div className="flex items-center gap-3 px-3">
            <IconBolt size={20} stroke={2.2} className="shrink-0 text-primary" />
            <span className="text-sm font-semibold tracking-[0.22em] text-on-surface uppercase">
              PULSE
            </span>
          </div>
        </div>

        <nav className="mt-4 flex flex-col gap-0.5 px-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                onClick={onNavigate}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-3 rounded px-3 py-2.5 text-sm transition-colors",
                    isActive
                      ? "bg-surface-container font-semibold text-primary"
                      : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
                  ].join(" ")
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={20}
                      stroke={1.75}
                      className={isActive ? "text-primary" : undefined}
                    />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-3 px-3 py-4">
        <div className="flex items-center gap-2 px-3">
          <button
            type="button"
            aria-label="Benachrichtigungen"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-surface-container text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
          >
            <IconBell size={20} stroke={1.75} />
          </button>
          <ThemeToggle />
          <button
            type="button"
            onClick={onOpenAi}
            aria-label="Pulse KI öffnen"
            title="Pulse KI"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-primary/15 text-primary transition-colors hover:bg-primary/25"
          >
            <IconSparkles size={20} stroke={1.75} />
          </button>
        </div>

        <div className="flex min-w-0 items-center gap-3 px-3">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-outline-variant bg-surface-container text-xs font-semibold text-on-surface"
            aria-hidden
          >
            {initials}
          </div>
          <div className="flex min-w-0 flex-1 flex-col text-left">
            <span className="truncate text-xs leading-tight font-semibold text-on-surface">
              {displayName}
            </span>
            <span className="truncate text-[11px] leading-tight text-on-surface-variant">
              {roleLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={logout}
            aria-label="Abmelden"
            title="Abmelden"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            <IconLogout size={16} stroke={1.75} />
          </button>
        </div>
      </div>
    </aside>
  );
}
