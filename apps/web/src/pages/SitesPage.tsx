import {
  IconChevronDown,
  IconChevronUp,
  IconPencil,
  IconPlus,
  IconSelector,
  IconTrash,
} from "@tabler/icons-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppTitle } from "../components/layout/AppTitle";
import { OptionsActions } from "../components/layout/OptionsActions";
import {
  matchesAnyField,
  textIncludes,
  useGlobalSearchQuery,
  useRegisterGlobalSearch,
} from "../lib/globalSearch";
import { setPanelTransitionDirection } from "../lib/panelTransition";
import {
  deleteSite,
  listSites,
  SitesApiError,
  type ManagedSite,
} from "../lib/sites";

type SortColumn = "key" | "name" | "colorCode";
type SortDirection = "asc" | "desc";

type ColumnFilters = {
  key: string;
  name: string;
  colorCode: string;
};

const EMPTY_FILTERS: ColumnFilters = {
  key: "",
  name: "",
  colorCode: "",
};

function compareSites(
  a: ManagedSite,
  b: ManagedSite,
  column: SortColumn,
): number {
  switch (column) {
    case "key":
      return a.key.localeCompare(b.key, "de");
    case "name":
      return a.name.localeCompare(b.name, "de");
    case "colorCode":
      return a.colorCode.localeCompare(b.colorCode, "de");
  }
}

function matchesFilters(site: ManagedSite, filters: ColumnFilters): boolean {
  return (
    textIncludes(site.key, filters.key) &&
    textIncludes(site.name, filters.name) &&
    textIncludes(site.colorCode, filters.colorCode)
  );
}

function searchableSiteText(site: ManagedSite): string[] {
  return [site.key, site.name, site.colorCode];
}

export function SitesPage() {
  const navigate = useNavigate();
  useRegisterGlobalSearch("lp");
  const searchQuery = useGlobalSearchQuery();
  const [sites, setSites] = useState<ManagedSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [selectionAnchorIndex, setSelectionAnchorIndex] = useState(0);
  const [sortColumn, setSortColumn] = useState<SortColumn>("key");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [filters, setFilters] = useState<ColumnFilters>(EMPTY_FILTERS);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await listSites();
      setSites(next);
      setSelectedKeys((prev) => {
        const valid = new Set(next.map((site) => site.key));
        const kept = new Set<string>();
        for (const key of prev) {
          if (valid.has(key)) kept.add(key);
        }
        return kept;
      });
    } catch (err) {
      setError(
        err instanceof SitesApiError
          ? err.message
          : "Mandanten konnten nicht geladen werden",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleSites = useMemo(() => {
    const filtered = sites.filter(
      (site) =>
        matchesFilters(site, filters) &&
        matchesAnyField(searchQuery, searchableSiteText(site)),
    );
    filtered.sort((a, b) => {
      const result = compareSites(a, b, sortColumn);
      return sortDirection === "asc" ? result : -result;
    });
    return filtered;
  }, [sites, filters, searchQuery, sortColumn, sortDirection]);

  useEffect(() => {
    const visible = new Set(visibleSites.map((site) => site.key));
    setSelectedKeys((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const key of prev) {
        if (visible.has(key)) next.add(key);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [visibleSites]);

  function setFilter(column: keyof ColumnFilters, value: string) {
    setFilters((prev) => ({ ...prev, [column]: value }));
  }

  function toggleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortColumn(column);
    setSortDirection("asc");
  }

  function selectRow(event: MouseEvent, index: number, key: string) {
    if (event.shiftKey) {
      const start = Math.min(selectionAnchorIndex, index);
      const end = Math.max(selectionAnchorIndex, index);
      const rangeKeys = visibleSites
        .slice(start, end + 1)
        .map((site) => site.key);
      setSelectedKeys(new Set(rangeKeys));
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
      setSelectionAnchorIndex(index);
      return;
    }

    if (selectedKeys.size === 1 && selectedKeys.has(key)) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set([key]));
    }
    setSelectionAnchorIndex(index);
  }

  const openEdit = useCallback(
    (key: string) => {
      setPanelTransitionDirection("forward");
      navigate(`/sites/${encodeURIComponent(key)}/edit`, {
        viewTransition: true,
      });
    },
    [navigate],
  );

  const selectionCount = selectedKeys.size;
  const canEdit = selectionCount === 1;
  const canDelete = selectionCount >= 1;

  const editSelected = useCallback(() => {
    if (selectedKeys.size !== 1) return;
    const [key] = selectedKeys;
    if (key) openEdit(key);
  }, [openEdit, selectedKeys]);

  const deleteSelected = useCallback(async () => {
    if (selectedKeys.size === 0) return;
    const count = selectedKeys.size;
    const confirmed = window.confirm(
      count === 1
        ? "Diesen Mandanten wirklich löschen?"
        : `${count} Mandanten wirklich löschen?`,
    );
    if (!confirmed) return;

    setError(null);
    try {
      for (const key of selectedKeys) {
        await deleteSite(key);
      }
      await load();
    } catch (err) {
      setError(
        err instanceof SitesApiError
          ? err.message
          : "Mandanten konnten nicht gelöscht werden",
      );
      await load();
    }
  }, [load, selectedKeys]);

  const emptyMessage =
    sites.length === 0
      ? "Noch keine Mandanten vorhanden."
      : searchQuery.trim()
        ? "Keine Treffer für die aktuelle Suche."
        : "Keine Treffer für die aktuellen Filter.";

  return (
    <div className="panel-transition">
      <div className="@container flex h-16 w-full items-center gap-3 border-b border-outline-variant px-3">
        <AppTitle
          title="Mandanten"
          count={loading ? null : visibleSites.length}
        />

        <div className="h-5 w-px shrink-0 bg-outline-variant" aria-hidden />

        <OptionsActions
          label="Mandanten-Aktionen"
          aside={
            error ? (
              <>
                <div
                  className="hidden h-5 w-px shrink-0 bg-outline-variant @[36rem]:block"
                  aria-hidden
                />
                <p
                  className="min-w-0 flex-1 truncate text-sm text-error"
                  role="alert"
                  title={error}
                >
                  {error}
                </p>
              </>
            ) : null
          }
        >
          {() => (
            <>
              <Link
                to="/sites/new"
                viewTransition
                onClick={() => setPanelTransitionDirection("forward")}
                className="inline-flex h-9 items-center gap-1.5 rounded border border-primary bg-primary px-3 text-sm font-semibold text-on-primary transition-colors hover:border-primary-container hover:bg-primary-container"
              >
                <IconPlus size={18} stroke={2} />
                Neu
              </Link>

              <button
                type="button"
                onClick={editSelected}
                disabled={!canEdit}
                className="inline-flex h-9 items-center gap-1.5 rounded border border-outline-variant bg-surface px-3 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low disabled:pointer-events-none disabled:opacity-50"
              >
                <IconPencil size={18} stroke={1.75} />
                Bearbeiten
                <span
                  className={[
                    "grid transition-[grid-template-columns] duration-200 ease-out motion-reduce:transition-none",
                    selectionCount > 0
                      ? "grid-cols-[1fr]"
                      : "grid-cols-[0fr]",
                  ].join(" ")}
                  aria-hidden={selectionCount === 0}
                >
                  <span className="min-w-0 overflow-hidden">
                    <span className="ml-0.5 inline-flex min-w-4 items-center justify-center rounded bg-surface-container-high px-1 text-[10px] leading-4 font-semibold text-on-surface-variant">
                      {selectionCount > 0 ? selectionCount : "\u00a0"}
                    </span>
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => void deleteSelected()}
                disabled={!canDelete}
                className="inline-flex h-9 items-center gap-1.5 rounded border border-error/40 bg-surface px-3 text-sm font-semibold text-error transition-colors hover:bg-error-container/40 disabled:pointer-events-none disabled:opacity-50"
              >
                <IconTrash size={18} stroke={1.75} />
                Löschen
              </button>
            </>
          )}
        </OptionsActions>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-outline-variant text-xs font-medium tracking-wide text-on-surface-variant uppercase">
              <SortableHeader
                label="Schlüssel"
                column="key"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={toggleSort}
              />
              <SortableHeader
                label="Name"
                column="name"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={toggleSort}
              />
              <SortableHeader
                label="Farbcode"
                column="colorCode"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={toggleSort}
              />
            </tr>
            <tr
              className="border-b border-outline-variant bg-surface-container-low"
              onClick={(event) => event.stopPropagation()}
            >
              <th className="px-3 py-2 font-normal">
                <ColumnFilterInput
                  label="Schlüssel filtern"
                  value={filters.key}
                  onChange={(value) => setFilter("key", value)}
                />
              </th>
              <th className="px-3 py-2 font-normal">
                <ColumnFilterInput
                  label="Name filtern"
                  value={filters.name}
                  onChange={(value) => setFilter("name", value)}
                />
              </th>
              <th className="px-3 py-2 font-normal">
                <ColumnFilterInput
                  label="Farbcode filtern"
                  value={filters.colorCode}
                  onChange={(value) => setFilter("colorCode", value)}
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-3 py-8 text-on-surface-variant"
                >
                  Laden…
                </td>
              </tr>
            ) : visibleSites.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-3 py-8 text-on-surface-variant"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              visibleSites.map((site, index) => {
                const isSelected = selectedKeys.has(site.key);
                return (
                  <tr
                    key={site.key}
                    onClick={(event) => selectRow(event, index, site.key)}
                    onDoubleClick={() => openEdit(site.key)}
                    className={[
                      "cursor-pointer border-b border-outline-variant/70 text-on-surface",
                      isSelected
                        ? "bg-surface-container"
                        : "hover:bg-surface-container-low",
                    ].join(" ")}
                    aria-selected={isSelected}
                  >
                    <td className="px-3 py-3 font-semibold">{site.key}</td>
                    <td className="px-3 py-3">{site.name}</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="inline-block h-4 w-4 shrink-0 rounded border border-outline-variant"
                          style={{ backgroundColor: site.colorCode }}
                          aria-hidden
                        />
                        <span className="font-mono text-on-surface-variant">
                          {site.colorCode}
                        </span>
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ColumnFilterInput(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="search"
      aria-label={props.label}
      value={props.value}
      onChange={(event) => props.onChange(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      className="w-full min-w-0 rounded border border-outline-variant bg-surface-container-lowest px-2 py-1.5 text-xs font-normal normal-case tracking-normal text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
      placeholder="Filtern…"
    />
  );
}

function SortableHeader(props: {
  label: string;
  column: SortColumn;
  activeColumn: SortColumn;
  direction: SortDirection;
  onSort: (column: SortColumn) => void;
}) {
  const isActive = props.activeColumn === props.column;
  const ariaSort = isActive
    ? props.direction === "asc"
      ? "ascending"
      : "descending"
    : "none";

  return (
    <th className="px-3 py-3 font-medium" aria-sort={ariaSort}>
      <button
        type="button"
        onClick={() => props.onSort(props.column)}
        className={[
          "inline-flex items-center gap-1 uppercase transition-colors",
          isActive
            ? "text-on-surface"
            : "text-on-surface-variant hover:text-on-surface",
        ].join(" ")}
      >
        <span>{props.label}</span>
        {isActive ? (
          props.direction === "asc" ? (
            <IconChevronUp size={14} stroke={2} aria-hidden />
          ) : (
            <IconChevronDown size={14} stroke={2} aria-hidden />
          )
        ) : (
          <IconSelector
            size={14}
            stroke={1.75}
            className="opacity-40"
            aria-hidden
          />
        )}
      </button>
    </th>
  );
}
