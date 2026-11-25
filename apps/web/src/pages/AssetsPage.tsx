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
  ASSET_TYPE_LABELS,
  AssetsApiError,
  assetTypeLabel,
  assetTypeMeta,
  deleteAsset,
  listAssets,
  type AssetType,
  type ManagedAsset,
} from "../lib/assets";
import {
  matchesAnyField,
  textIncludes,
  useGlobalSearchQuery,
  useRegisterGlobalSearch,
} from "../lib/globalSearch";
import { setPanelTransitionDirection } from "../lib/panelTransition";
import { tokenTone } from "../lib/tokenTone";

type SortColumn =
  | "key"
  | "type"
  | "parentKey"
  | "costCenterKey"
  | "serialNumber"
  | "manufacturer";
type SortDirection = "asc" | "desc";

type ColumnFilters = {
  key: string;
  type: string;
  parentKey: string;
  costCenterKey: string;
  serialNumber: string;
  manufacturer: string;
};

const EMPTY_FILTERS: ColumnFilters = {
  key: "",
  type: "",
  parentKey: "",
  costCenterKey: "",
  serialNumber: "",
  manufacturer: "",
};

function displayOptional(value: string | null): string {
  return value && value.length > 0 ? value : "—";
}

function compareAssets(
  a: ManagedAsset,
  b: ManagedAsset,
  column: SortColumn,
): number {
  switch (column) {
    case "key":
      return a.key.localeCompare(b.key, "de");
    case "type":
      return assetTypeLabel(a.type).localeCompare(assetTypeLabel(b.type), "de");
    case "parentKey":
      return displayOptional(a.parentKey).localeCompare(
        displayOptional(b.parentKey),
        "de",
      );
    case "costCenterKey":
      return a.costCenterKey.localeCompare(b.costCenterKey, "de");
    case "serialNumber":
      return displayOptional(a.serialNumber).localeCompare(
        displayOptional(b.serialNumber),
        "de",
      );
    case "manufacturer":
      return displayOptional(a.manufacturer).localeCompare(
        displayOptional(b.manufacturer),
        "de",
      );
  }
}

function matchesFilters(asset: ManagedAsset, filters: ColumnFilters): boolean {
  return (
    textIncludes(asset.key, filters.key) &&
    textIncludes(assetTypeLabel(asset.type), filters.type) &&
    textIncludes(displayOptional(asset.parentKey), filters.parentKey) &&
    textIncludes(asset.costCenterKey, filters.costCenterKey) &&
    textIncludes(displayOptional(asset.serialNumber), filters.serialNumber) &&
    textIncludes(displayOptional(asset.manufacturer), filters.manufacturer)
  );
}

function searchableAssetText(asset: ManagedAsset): string[] {
  return [
    asset.key,
    assetTypeLabel(asset.type),
    ASSET_TYPE_LABELS[asset.type],
    displayOptional(asset.parentKey),
    asset.costCenterKey,
    displayOptional(asset.serialNumber),
    displayOptional(asset.manufacturer),
  ];
}

export function AssetsPage() {
  const navigate = useNavigate();
  useRegisterGlobalSearch("lp");
  const searchQuery = useGlobalSearchQuery();
  const [assets, setAssets] = useState<ManagedAsset[]>([]);
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
      const next = await listAssets();
      setAssets(next);
      setSelectedKeys((prev) => {
        const valid = new Set(next.map((item) => item.key));
        const kept = new Set<string>();
        for (const key of prev) {
          if (valid.has(key)) kept.add(key);
        }
        return kept;
      });
    } catch (err) {
      setError(
        err instanceof AssetsApiError
          ? err.message
          : "Assets konnten nicht geladen werden",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleAssets = useMemo(() => {
    const filtered = assets.filter(
      (item) =>
        matchesFilters(item, filters) &&
        matchesAnyField(searchQuery, searchableAssetText(item)),
    );
    filtered.sort((a, b) => {
      const result = compareAssets(a, b, sortColumn);
      return sortDirection === "asc" ? result : -result;
    });
    return filtered;
  }, [assets, filters, searchQuery, sortColumn, sortDirection]);

  useEffect(() => {
    const visible = new Set(visibleAssets.map((item) => item.key));
    setSelectedKeys((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const key of prev) {
        if (visible.has(key)) next.add(key);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [visibleAssets]);

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
      const rangeKeys = visibleAssets.slice(start, end + 1).map((item) => item.key);
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
      navigate(`/assets/${encodeURIComponent(key)}/edit`, {
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
        ? "Dieses Asset wirklich löschen?"
        : `${count} Assets wirklich löschen?`,
    );
    if (!confirmed) return;

    setError(null);
    try {
      for (const key of selectedKeys) {
        await deleteAsset(key);
      }
      await load();
    } catch (err) {
      setError(
        err instanceof AssetsApiError
          ? err.message
          : "Assets konnten nicht gelöscht werden",
      );
      await load();
    }
  }, [load, selectedKeys]);

  const emptyMessage =
    assets.length === 0
      ? "Noch keine Assets vorhanden."
      : searchQuery.trim()
        ? "Keine Treffer für die aktuelle Suche."
        : "Keine Treffer für die aktuellen Filter.";

  return (
    <div className="panel-transition">
      <div className="@container flex h-16 w-full items-center gap-3 border-b border-outline-variant px-3">
        <div className="flex w-52 shrink-0 items-baseline gap-2">
          <h1 className="text-lg leading-6 font-semibold text-on-surface">
            Assets
          </h1>
          {!loading ? (
            <span className="text-sm font-semibold text-on-surface-variant">
              [{visibleAssets.length}]
            </span>
          ) : null}
        </div>

        <div className="h-5 w-px shrink-0 bg-outline-variant" aria-hidden />

        <OptionsActions
          label="Assets-Aktionen"
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
                to="/assets/new"
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
                    selectionCount > 0 ? "grid-cols-[1fr]" : "grid-cols-[0fr]",
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
        <table className="w-full min-w-[960px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-outline-variant text-xs font-medium tracking-wide text-on-surface-variant uppercase">
              <th className="w-14 px-3 py-3 font-medium">Bild</th>
              <SortableHeader
                label="Schlüssel"
                column="key"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={toggleSort}
              />
              <SortableHeader
                label="Typ"
                column="type"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={toggleSort}
              />
              <SortableHeader
                label="Typ"
                column="parentKey"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={toggleSort}
              />
              <SortableHeader
                label="Kostenstelle"
                column="costCenterKey"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={toggleSort}
              />
              <SortableHeader
                label="Seriennummer"
                column="serialNumber"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={toggleSort}
              />
              <SortableHeader
                label="Hersteller"
                column="manufacturer"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={toggleSort}
              />
            </tr>
            <tr
              className="border-b border-outline-variant bg-surface-container-low"
              onClick={(event) => event.stopPropagation()}
            >
              <th className="px-3 py-2 font-normal" aria-hidden />
              <th className="px-3 py-2 font-normal">
                <ColumnFilterInput
                  label="Schlüssel filtern"
                  value={filters.key}
                  onChange={(value) => setFilter("key", value)}
                />
              </th>
              <th className="px-3 py-2 font-normal">
                <ColumnFilterInput
                  label="Typ filtern"
                  value={filters.type}
                  onChange={(value) => setFilter("type", value)}
                />
              </th>
              <th className="px-3 py-2 font-normal">
                <ColumnFilterInput
                  label="Typ filtern"
                  value={filters.parentKey}
                  onChange={(value) => setFilter("parentKey", value)}
                />
              </th>
              <th className="px-3 py-2 font-normal">
                <ColumnFilterInput
                  label="Kostenstelle filtern"
                  value={filters.costCenterKey}
                  onChange={(value) => setFilter("costCenterKey", value)}
                />
              </th>
              <th className="px-3 py-2 font-normal">
                <ColumnFilterInput
                  label="Seriennummer filtern"
                  value={filters.serialNumber}
                  onChange={(value) => setFilter("serialNumber", value)}
                />
              </th>
              <th className="px-3 py-2 font-normal">
                <ColumnFilterInput
                  label="Hersteller filtern"
                  value={filters.manufacturer}
                  onChange={(value) => setFilter("manufacturer", value)}
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-on-surface-variant">
                  Laden…
                </td>
              </tr>
            ) : visibleAssets.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-on-surface-variant">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              visibleAssets.map((item, index) => {
                const isSelected = selectedKeys.has(item.key);
                return (
                  <tr
                    key={item.key}
                    onClick={(event) => selectRow(event, index, item.key)}
                    onDoubleClick={() => openEdit(item.key)}
                    className={[
                      "cursor-pointer border-b border-outline-variant/70 text-on-surface",
                      isSelected
                        ? "bg-surface-container"
                        : "hover:bg-surface-container-low",
                    ].join(" ")}
                    aria-selected={isSelected}
                  >
                    <td className="px-3 py-2">
                      <AssetThumbnail src={item.thumbnailUrl} alt={item.key} />
                    </td>
                    <td className="px-3 py-3 font-semibold">{item.key}</td>
                    <td className="px-3 py-3">
                      <AssetTypeChip type={item.type} />
                    </td>
                    <td className="px-3 py-3">
                      {displayOptional(item.parentKey)}
                    </td>
                    <td className="px-3 py-3">{item.costCenterKey}</td>
                    <td className="px-3 py-3">
                      {displayOptional(item.serialNumber)}
                    </td>
                    <td className="px-3 py-3">
                      {displayOptional(item.manufacturer)}
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

function AssetThumbnail(props: { src: string | null; alt: string }) {
  if (!props.src) {
    return (
      <span
        className="inline-flex h-10 w-10 items-center justify-center rounded border border-outline-variant/70 bg-surface-container-low text-[10px] font-semibold text-on-surface-variant"
        aria-hidden
      >
        —
      </span>
    );
  }
  return (
    <img
      src={props.src}
      alt={props.alt}
      className="h-10 w-10 rounded border border-outline-variant/70 object-cover"
    />
  );
}

function AssetTypeChip(props: { type: AssetType }) {
  const meta = assetTypeMeta(props.type);
  const tone = tokenTone(meta.color);
  const Icon = meta.icon;
  return (
    <span
      title={meta.label}
      className={[
        "inline-flex h-6 max-w-full items-center gap-1 rounded px-2 text-xs font-semibold",
        tone ? "" : "bg-surface-container-high text-on-surface",
      ]
        .filter(Boolean)
        .join(" ")}
      style={tone ?? undefined}
    >
      <Icon size={14} stroke={1.75} aria-hidden />
      <span className="truncate">{meta.label}</span>
    </span>
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
