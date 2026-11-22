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
import { OptionsActions } from "../components/layout/OptionsActions";
import {
  matchesAnyField,
  textIncludes,
  useGlobalSearchQuery,
  useRegisterGlobalSearch,
} from "../lib/globalSearch";
import { setPanelTransitionDirection } from "../lib/panelTransition";
import { tokenTone } from "../lib/tokenTone";
import {
  deleteUser,
  listUsers,
  UsersApiError,
  type ManagedUser,
} from "../lib/users";

type SortColumn =
  | "key"
  | "loginName"
  | "name"
  | "secondarySites"
  | "employee";
type SortDirection = "asc" | "desc";

type ColumnFilters = {
  key: string;
  loginName: string;
  name: string;
  secondarySites: string;
  employee: string;
};

const EMPTY_FILTERS: ColumnFilters = {
  key: "",
  loginName: "",
  name: "",
  secondarySites: "",
  employee: "",
};

function secondarySitesLabel(user: ManagedUser): string {
  return user.secondarySites.length > 0
    ? user.secondarySites.map((s) => s.key).join(", ")
    : "—";
}

function SiteTokens(props: { sites: ManagedUser["secondarySites"] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {props.sites.map((site) => {
        const tone = tokenTone(site.colorCode);
        return (
          <span
            key={site.key}
            title={`${site.key} — ${site.name}`}
            className={[
              "inline-flex h-6 max-w-full items-center rounded px-2 text-xs font-semibold",
              tone ? "" : "bg-surface-container-high text-on-surface",
            ]
              .filter(Boolean)
              .join(" ")}
            style={tone ?? undefined}
          >
            {site.key}
          </span>
        );
      })}
    </span>
  );
}

function employeeLabel(user: ManagedUser): string {
  return user.employee?.key ?? "—";
}

function fullName(user: ManagedUser): string {
  const name = `${user.firstName} ${user.lastName}`.trim();
  return name.length > 0 ? name : "—";
}

function compareUsers(
  a: ManagedUser,
  b: ManagedUser,
  column: SortColumn,
): number {
  switch (column) {
    case "key":
      return a.key.localeCompare(b.key, "de");
    case "loginName":
      return a.loginName.localeCompare(b.loginName, "de");
    case "name": {
      const byLast = a.lastName.localeCompare(b.lastName, "de");
      if (byLast !== 0) return byLast;
      return a.firstName.localeCompare(b.firstName, "de");
    }
    case "secondarySites":
      return secondarySitesLabel(a).localeCompare(secondarySitesLabel(b), "de");
    case "employee":
      return employeeLabel(a).localeCompare(employeeLabel(b), "de");
  }
}

function matchesFilters(user: ManagedUser, filters: ColumnFilters): boolean {
  return (
    textIncludes(user.key, filters.key) &&
    textIncludes(user.loginName, filters.loginName) &&
    textIncludes(fullName(user), filters.name) &&
    textIncludes(secondarySitesLabel(user), filters.secondarySites) &&
    textIncludes(employeeLabel(user), filters.employee)
  );
}

function searchableUserText(user: ManagedUser): string[] {
  return [
    user.key,
    user.loginName,
    user.firstName,
    user.lastName,
    ...user.secondarySites.map((site) => site.key),
    employeeLabel(user),
  ];
}

export function UsersPage() {
  const navigate = useNavigate();
  useRegisterGlobalSearch("lp");
  const searchQuery = useGlobalSearchQuery();
  const [users, setUsers] = useState<ManagedUser[]>([]);
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
      const next = await listUsers();
      setUsers(next);
      setSelectedKeys((prev) => {
        const valid = new Set(next.map((user) => user.key));
        const kept = new Set<string>();
        for (const key of prev) {
          if (valid.has(key)) kept.add(key);
        }
        return kept;
      });
    } catch (err) {
      setError(
        err instanceof UsersApiError
          ? err.message
          : "Benutzer konnten nicht geladen werden",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleUsers = useMemo(() => {
    const filtered = users.filter(
      (user) =>
        matchesFilters(user, filters) &&
        matchesAnyField(searchQuery, searchableUserText(user)),
    );
    filtered.sort((a, b) => {
      const result = compareUsers(a, b, sortColumn);
      return sortDirection === "asc" ? result : -result;
    });
    return filtered;
  }, [users, filters, searchQuery, sortColumn, sortDirection]);

  useEffect(() => {
    const visible = new Set(visibleUsers.map((user) => user.key));
    setSelectedKeys((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const key of prev) {
        if (visible.has(key)) next.add(key);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [visibleUsers]);

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
      const rangeKeys = visibleUsers
        .slice(start, end + 1)
        .map((user) => user.key);
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
      navigate(`/users/${encodeURIComponent(key)}/edit`, {
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
        ? "Diesen Benutzer wirklich löschen?"
        : `${count} Benutzer wirklich löschen?`,
    );
    if (!confirmed) return;

    setError(null);
    try {
      for (const key of selectedKeys) {
        await deleteUser(key);
      }
      await load();
    } catch (err) {
      setError(
        err instanceof UsersApiError
          ? err.message
          : "Benutzer konnten nicht gelöscht werden",
      );
    }
  }, [load, selectedKeys]);

  const emptyMessage =
    users.length === 0
      ? "Noch keine Benutzer vorhanden."
      : searchQuery.trim()
        ? "Keine Treffer für die aktuelle Suche."
        : "Keine Treffer für die aktuellen Filter.";

  return (
    <div className="panel-transition">
      <div className="@container flex h-16 w-full items-center gap-3 border-b border-outline-variant px-3">
        <div className="flex w-52 shrink-0 items-baseline gap-2">
          <h1 className="text-lg leading-6 font-semibold text-on-surface">
            Benutzer
          </h1>
          {!loading ? (
            <span className="text-sm font-semibold text-on-surface-variant">
              [{visibleUsers.length}]
            </span>
          ) : null}
        </div>

        <div className="h-5 w-px shrink-0 bg-outline-variant" aria-hidden />

        <OptionsActions
          label="Benutzer-Aktionen"
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
                to="/users/new"
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
                label="Login"
                column="loginName"
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
                label="Nebenmandanten"
                column="secondarySites"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={toggleSort}
              />
              <SortableHeader
                label="Mitarbeiter"
                column="employee"
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
                  label="Login filtern"
                  value={filters.loginName}
                  onChange={(value) => setFilter("loginName", value)}
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
                  label="Nebenmandanten filtern"
                  value={filters.secondarySites}
                  onChange={(value) => setFilter("secondarySites", value)}
                />
              </th>
              <th className="px-3 py-2 font-normal">
                <ColumnFilterInput
                  label="Mitarbeiter filtern"
                  value={filters.employee}
                  onChange={(value) => setFilter("employee", value)}
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-8 text-on-surface-variant"
                >
                  Laden…
                </td>
              </tr>
            ) : visibleUsers.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-8 text-on-surface-variant"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              visibleUsers.map((user, index) => {
                const isSelected = selectedKeys.has(user.key);
                return (
                  <tr
                    key={user.key}
                    onClick={(event) => selectRow(event, index, user.key)}
                    onDoubleClick={() => openEdit(user.key)}
                    className={[
                      "cursor-pointer border-b border-outline-variant/70 text-on-surface",
                      isSelected
                        ? "bg-surface-container"
                        : "hover:bg-surface-container-low",
                    ].join(" ")}
                    aria-selected={isSelected}
                  >
                    <td className="px-3 py-3 font-semibold">{user.key}</td>
                    <td className="px-3 py-3">{user.loginName}</td>
                    <td className="px-3 py-3">{fullName(user)}</td>
                    <td className="px-3 py-3">
                      {user.secondarySites.length === 0 ? (
                        <span className="text-on-surface-variant">—</span>
                      ) : (
                        <SiteTokens sites={user.secondarySites} />
                      )}
                    </td>
                    <td className="px-3 py-3 text-on-surface-variant">
                      {employeeLabel(user)}
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
