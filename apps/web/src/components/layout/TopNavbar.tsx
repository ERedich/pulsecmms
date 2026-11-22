import { IconMenu2, IconPlus, IconSearch, IconX } from "@tabler/icons-react";
import { useGlobalSearchControls } from "../../lib/globalSearch";

const PLACEHOLDER: Record<"lp" | "ep" | "idle", string> = {
  lp: "Daten suchen…",
  ep: "Felder suchen…",
  idle: "Suche in einer App…",
};

type TopNavbarProps = {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
};

export function TopNavbar({ sidebarOpen, onToggleSidebar }: TopNavbarProps) {
  const { query, setQuery, mode } = useGlobalSearchControls();
  const placeholder = PLACEHOLDER[mode ?? "idle"];

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b border-outline-variant bg-surface pr-8 pl-3">
      <button
        type="button"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded border border-outline-variant bg-surface text-on-surface transition-colors hover:bg-surface-container-low lg:hidden"
        aria-label={sidebarOpen ? "Navigation schließen" : "Navigation öffnen"}
        aria-expanded={sidebarOpen}
        aria-controls="app-sidebar"
        onClick={onToggleSidebar}
      >
        {sidebarOpen ? (
          <IconX size={20} stroke={1.75} />
        ) : (
          <IconMenu2 size={20} stroke={1.75} />
        )}
      </button>

      <div className="relative flex min-w-0 flex-1 items-center max-w-lg">
        <IconSearch
          size={20}
          stroke={1.75}
          className="pointer-events-none absolute left-3.5 text-on-surface-variant"
        />
        <input
          type="search"
          value={query}
          disabled={mode === null}
          placeholder={placeholder}
          aria-label={placeholder}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setQuery("");
          }}
          className="global-search w-full min-w-0 rounded border border-outline-variant bg-surface-container-low py-2 pr-10 pl-10 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none disabled:opacity-50"
        />
        {query ? (
          <button
            type="button"
            aria-label="Suche leeren"
            onClick={() => setQuery("")}
            className="absolute right-2 flex size-7 items-center justify-center rounded text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
          >
            <IconX size={16} stroke={2} />
          </button>
        ) : null}
      </div>

      <button
        type="button"
        className="ml-auto flex shrink-0 items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-container"
      >
        <IconPlus size={18} stroke={2} />
        <span>Neuer Auftrag</span>
      </button>
    </header>
  );
}
