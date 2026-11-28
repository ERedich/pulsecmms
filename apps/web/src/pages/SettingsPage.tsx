import {
  IconChevronDown,
  IconChevronUp,
  IconSelector,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppTitle } from "../components/layout/AppTitle";
import {
  matchesAnyField,
  textIncludes,
  useGlobalSearchQuery,
  useRegisterGlobalSearch,
} from "../lib/globalSearch";
import { setPanelTransitionDirection } from "../lib/panelTransition";
import {
  formatSettingValue,
  listSettings,
  SettingsApiError,
  type ManagedSetting,
  type SettingCategory,
} from "../lib/settings";

type SortColumn = "key" | "name" | "description" | "value";
type SortDirection = "asc" | "desc";

type ColumnFilters = {
  key: string;
  name: string;
  description: string;
  value: string;
};

const EMPTY_FILTERS: ColumnFilters = {
  key: "",
  name: "",
  description: "",
  value: "",
};

const CATEGORY_TABS: {
  id: SettingCategory;
  label: string;
}[] = [
  { id: "general", label: "Allgemein" },
  { id: "lists", label: "Listen" },
  { id: "orders", label: "Aufträge" },
];

function parseCategory(raw: string | null): SettingCategory {
  if (raw === "lists" || raw === "orders" || raw === "general") {
    return raw;
  }
  return "general";
}

function compareSettings(
  a: ManagedSetting,
  b: ManagedSetting,
  column: SortColumn,
): number {
  switch (column) {
    case "key":
      return a.key.localeCompare(b.key, "de");
    case "name":
      return a.name.localeCompare(b.name, "de");
    case "description":
      return a.description.localeCompare(b.description, "de");
    case "value":
      return a.value - b.value;
  }
}

function matchesFilters(
  setting: ManagedSetting,
  filters: ColumnFilters,
): boolean {
  return (
    textIncludes(setting.key, filters.key) &&
    textIncludes(setting.name, filters.name) &&
    textIncludes(setting.description, filters.description) &&
    textIncludes(formatSettingValue(setting), filters.value)
  );
}

function searchableSettingText(setting: ManagedSetting): string[] {
  return [
    setting.key,
    setting.name,
    setting.description,
    formatSettingValue(setting),
  ];
}

export function SettingsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  useRegisterGlobalSearch("lp");
  const searchQuery = useGlobalSearchQuery();
  const category = parseCategory(searchParams.get("category"));

  const [settings, setSettings] = useState<ManagedSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>("key");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [filters, setFilters] = useState<ColumnFilters>(EMPTY_FILTERS);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await listSettings();
      setSettings(next);
    } catch (err) {
      setError(
        err instanceof SettingsApiError
          ? err.message
          : "Einstellungen konnten nicht geladen werden",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const raw = searchParams.get("category");
    if (raw == null) return;
    if (raw === "general" || raw === "lists" || raw === "orders") return;
    const next = new URLSearchParams(searchParams);
    next.delete("category");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const categorySettings = useMemo(
    () => settings.filter((item) => item.category === category),
    [category, settings],
  );

  const visibleSettings = useMemo(() => {
    const filtered = categorySettings.filter(
      (item) =>
        matchesFilters(item, filters) &&
        matchesAnyField(searchQuery, searchableSettingText(item)),
    );
    const sorted = [...filtered].sort((a, b) => {
      const result = compareSettings(a, b, sortColumn);
      return sortDirection === "asc" ? result : -result;
    });
    return sorted;
  }, [
    categorySettings,
    filters,
    searchQuery,
    sortColumn,
    sortDirection,
  ]);

  function setFilter(column: keyof ColumnFilters, value: string) {
    setFilters((prev) => ({ ...prev, [column]: value }));
  }

  function toggleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortColumn(column);
    setSortDirection("asc");
  }

  const openEdit = useCallback(
    (key: string) => {
      setPanelTransitionDirection("forward");
      const params = new URLSearchParams();
      if (category !== "general") {
        params.set("category", category);
      }
      const query = params.toString();
      navigate(
        `/settings/${encodeURIComponent(key)}/edit${query ? `?${query}` : ""}`,
        { viewTransition: true },
      );
    },
    [category, navigate],
  );

  function selectCategory(next: SettingCategory) {
    const params = new URLSearchParams(searchParams);
    if (next === "general") {
      params.delete("category");
    } else {
      params.set("category", next);
    }
    setSearchParams(params, { replace: true });
    setFilters(EMPTY_FILTERS);
  }

  const emptyMessage =
    categorySettings.length === 0
      ? "Noch keine Einstellungen vorhanden."
      : searchQuery.trim()
        ? "Keine Treffer für die aktuelle Suche."
        : "Keine Treffer für die aktuellen Filter.";

  return (
    <div className="panel-transition">
      <div className="flex h-16 w-full items-center gap-3 border-b border-outline-variant px-3">
        <AppTitle
          title="Einstellungen"
          count={loading ? null : visibleSettings.length}
        />

        <div className="h-5 w-px shrink-0 bg-outline-variant" aria-hidden />

        <div
          role="tablist"
          aria-label="Einstellungskategorien"
          className="flex min-w-0 flex-1 items-center gap-2"
        >
          {CATEGORY_TABS.map((tab) => {
            const active = tab.id === category;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectCategory(tab.id)}
                className={[
                  "inline-flex h-9 shrink-0 items-center rounded border px-3 text-sm font-semibold transition-colors",
                  active
                    ? "border-primary bg-primary text-on-primary"
                    : "border-outline-variant bg-surface text-on-surface hover:bg-surface-container-low",
                ].join(" ")}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {error ? (
          <>
            <div
              className="h-5 w-px shrink-0 bg-outline-variant"
              aria-hidden
            />
            <p
              className="min-w-0 max-w-xs truncate text-sm text-error sm:max-w-sm"
              role="alert"
              title={error}
            >
              {error}
            </p>
          </>
        ) : null}
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
                label="Beschreibung"
                column="description"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={toggleSort}
              />
              <SortableHeader
                label="Wert"
                column="value"
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
                  label="Beschreibung filtern"
                  value={filters.description}
                  onChange={(value) => setFilter("description", value)}
                />
              </th>
              <th className="px-3 py-2 font-normal">
                <ColumnFilterInput
                  label="Wert filtern"
                  value={filters.value}
                  onChange={(value) => setFilter("value", value)}
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-8 text-on-surface-variant"
                >
                  Laden…
                </td>
              </tr>
            ) : visibleSettings.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-8 text-on-surface-variant"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              visibleSettings.map((item) => (
                <tr
                  key={item.key}
                  onDoubleClick={() => openEdit(item.key)}
                  className="cursor-pointer border-b border-outline-variant/70 text-on-surface hover:bg-surface-container-low"
                >
                  <td className="px-3 py-3 font-semibold">{item.key}</td>
                  <td className="px-3 py-3">{item.name}</td>
                  <td className="px-3 py-3">{item.description || "—"}</td>
                  <td className="px-3 py-3">{formatSettingValue(item)}</td>
                </tr>
              ))
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
