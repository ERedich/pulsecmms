import {
  IconChevronDown,
  IconChevronUp,
  IconSelector,
  IconTrash,
  IconUpload,
  IconX,
} from "@tabler/icons-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { DocumentFileGlyph } from "../components/DocumentFileGlyph";
import { DocumentImageLightbox } from "../components/DocumentImageLightbox";
import { AppTitle } from "../components/layout/AppTitle";
import { OptionsActions } from "../components/layout/OptionsActions";
import {
  DocumentsApiError,
  deleteDocument,
  documentKind,
  documentRowId,
  formatDocumentDate,
  formatDocumentSize,
  listDocuments,
  openDocument,
  parseDocumentRowId,
  uploadDocuments,
  type ManagedDocument,
} from "../lib/documents";
import {
  matchesAnyField,
  textIncludes,
  useGlobalSearchQuery,
  useRegisterGlobalSearch,
} from "../lib/globalSearch";
import { setPanelTransitionDirection } from "../lib/panelTransition";

type SortColumn = "name" | "kind" | "size" | "modifiedAt" | "recordKey";
type SortDirection = "asc" | "desc";

type ColumnFilters = {
  name: string;
  kind: string;
  size: string;
  modifiedAt: string;
  recordKey: string;
};

const EMPTY_FILTERS: ColumnFilters = {
  name: "",
  kind: "",
  size: "",
  modifiedAt: "",
  recordKey: "",
};

type DocumentsLocationState = {
  returnTo?: string;
  returnState?: unknown;
};

function resolveReturn(
  state: unknown,
  recordKey: string | undefined,
): { path: string | null; state: unknown } {
  if (state && typeof state === "object") {
    const typed = state as DocumentsLocationState;
    if (typeof typed.returnTo === "string" && typed.returnTo.length > 0) {
      return { path: typed.returnTo, state: typed.returnState };
    }
  }
  if (recordKey) {
    return {
      path: `/assets/${encodeURIComponent(recordKey)}/edit`,
      state: undefined,
    };
  }
  return { path: null, state: undefined };
}

function compareDocuments(
  a: ManagedDocument,
  b: ManagedDocument,
  column: SortColumn,
): number {
  switch (column) {
    case "name":
      return a.name.localeCompare(b.name, "de");
    case "kind":
      return documentKind(a.name).localeCompare(documentKind(b.name), "de");
    case "size":
      return a.size - b.size;
    case "modifiedAt":
      return a.modifiedAt.localeCompare(b.modifiedAt);
    case "recordKey":
      return a.recordKey.localeCompare(b.recordKey, "de");
  }
}

function matchesFilters(
  doc: ManagedDocument,
  filters: ColumnFilters,
): boolean {
  return (
    textIncludes(doc.name, filters.name) &&
    textIncludes(documentKind(doc.name), filters.kind) &&
    textIncludes(formatDocumentSize(doc.size), filters.size) &&
    textIncludes(formatDocumentDate(doc.modifiedAt), filters.modifiedAt) &&
    textIncludes(doc.recordKey, filters.recordKey)
  );
}

function searchableDocumentText(doc: ManagedDocument): string[] {
  return [
    doc.name,
    documentKind(doc.name),
    formatDocumentSize(doc.size),
    formatDocumentDate(doc.modifiedAt),
    doc.recordKey,
  ];
}

export function DocumentsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { key: recordKey } = useParams<{ key?: string }>();
  const scoped = Boolean(recordKey);
  useRegisterGlobalSearch("lp");
  const searchQuery = useGlobalSearchQuery();

  const [documents, setDocuments] = useState<ManagedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionAnchorIndex, setSelectionAnchorIndex] = useState(0);
  const [sortColumn, setSortColumn] = useState<SortColumn>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [filters, setFilters] = useState<ColumnFilters>(EMPTY_FILTERS);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const returnTarget = resolveReturn(location.state, recordKey);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await listDocuments({
        app: "assets",
        recordKey: recordKey || undefined,
      });
      setDocuments(next);
      setSelectedIds((prev) => {
        const valid = new Set(next.map((item) => documentRowId(item)));
        const kept = new Set<string>();
        for (const id of prev) {
          if (valid.has(id)) kept.add(id);
        }
        return kept;
      });
    } catch (err) {
      setError(
        err instanceof DocumentsApiError
          ? err.message
          : "Dokumente konnten nicht geladen werden",
      );
    } finally {
      setLoading(false);
    }
  }, [recordKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredDocuments = useMemo(() => {
    return documents.filter(
      (doc) =>
        matchesFilters(doc, filters) &&
        matchesAnyField(searchQuery, searchableDocumentText(doc)),
    );
  }, [documents, filters, searchQuery]);

  const visibleDocuments = useMemo(() => {
    const sorted = [...filteredDocuments];
    sorted.sort((a, b) => {
      const result = compareDocuments(a, b, sortColumn);
      return sortDirection === "asc" ? result : -result;
    });
    return sorted;
  }, [filteredDocuments, sortColumn, sortDirection]);

  useEffect(() => {
    const visibleIds = new Set(visibleDocuments.map((item) => documentRowId(item)));
    setSelectedIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (visibleIds.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [visibleDocuments]);

  const toggleSort = useCallback((column: SortColumn) => {
    setSortColumn((current) => {
      if (current === column) {
        setSortDirection((direction) =>
          direction === "asc" ? "desc" : "asc",
        );
        return current;
      }
      setSortDirection("asc");
      return column;
    });
  }, []);

  const setFilter = useCallback(
    (column: keyof ColumnFilters, value: string) => {
      setFilters((prev) => ({ ...prev, [column]: value }));
    },
    [],
  );

  const selectRow = useCallback(
    (event: MouseEvent, index: number, id: string) => {
      const multi = event.ctrlKey || event.metaKey;
      const range = event.shiftKey;

      setSelectedIds((prev) => {
        if (range) {
          const start = Math.min(selectionAnchorIndex, index);
          const end = Math.max(selectionAnchorIndex, index);
          const next = multi ? new Set(prev) : new Set<string>();
          for (let i = start; i <= end; i += 1) {
            const row = visibleDocuments[i];
            if (row) next.add(documentRowId(row));
          }
          return next;
        }

        if (multi) {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          setSelectionAnchorIndex(index);
          return next;
        }

        if (prev.size === 1 && prev.has(id)) {
          setSelectionAnchorIndex(index);
          return new Set();
        }

        setSelectionAnchorIndex(index);
        return new Set([id]);
      });
    },
    [selectionAnchorIndex, visibleDocuments],
  );

  const closeImagePreview = useCallback(() => {
    setImagePreview((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
  }, []);

  const openDocumentEntry = useCallback(async (doc: ManagedDocument) => {
    setError(null);
    try {
      const result = await openDocument(doc.app, doc.recordKey, doc.name);
      if (result.kind === "image") {
        setImagePreview((current) => {
          if (current) URL.revokeObjectURL(current.url);
          return { url: result.url, name: result.name };
        });
      }
    } catch (err) {
      setError(
        err instanceof DocumentsApiError
          ? err.message
          : "Dokument konnte nicht geöffnet werden",
      );
    }
  }, []);

  const deleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    const confirmed = window.confirm(
      count === 1
        ? "Dieses Dokument wirklich löschen?"
        : `${count} Dokumente wirklich löschen?`,
    );
    if (!confirmed) return;

    setError(null);
    try {
      for (const id of selectedIds) {
        const parsed = parseDocumentRowId(id);
        if (!parsed) continue;
        await deleteDocument(parsed.app, parsed.recordKey, parsed.name);
      }
      await load();
    } catch (err) {
      setError(
        err instanceof DocumentsApiError
          ? err.message
          : "Dokumente konnten nicht gelöscht werden",
      );
      await load();
    }
  }, [load, selectedIds]);

  const onUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFilesChosen = useCallback(
    async (fileList: FileList | null) => {
      if (!recordKey || !fileList || fileList.length === 0) return;
      setUploading(true);
      setError(null);
      try {
        await uploadDocuments("assets", recordKey, Array.from(fileList));
        await load();
      } catch (err) {
        setError(
          err instanceof DocumentsApiError
            ? err.message
            : "Dokumente konnten nicht hochgeladen werden",
        );
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [load, recordKey],
  );

  const closeScoped = useCallback(() => {
    if (!returnTarget.path) {
      navigate("/documents");
      return;
    }
    setPanelTransitionDirection("back");
    navigate(returnTarget.path, {
      viewTransition: true,
      state: returnTarget.state,
    });
  }, [navigate, returnTarget.path, returnTarget.state]);

  const selectionCount = selectedIds.size;
  const canDelete = selectionCount > 0 && !uploading;

  const emptyMessage =
    documents.length === 0
      ? "Noch keine Dokumente vorhanden."
      : searchQuery.trim()
        ? "Keine Treffer für die aktuelle Suche."
        : "Keine Treffer für die aktuellen Filter.";

  return (
    <div className="panel-transition">
      <div className="@container flex h-16 w-full items-center gap-3 border-b border-outline-variant px-3">
        <AppTitle
          title="Dokumente"
          count={loading ? null : visibleDocuments.length}
        />

        <div className="h-5 w-px shrink-0 bg-outline-variant" aria-hidden />

        <OptionsActions
          label="Dokumente-Aktionen"
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
              {scoped ? (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    multiple
                    onChange={(event) =>
                      void onFilesChosen(event.target.files)
                    }
                  />
                  <button
                    type="button"
                    onClick={onUploadClick}
                    disabled={uploading || loading}
                    className="inline-flex h-9 items-center gap-1.5 rounded border border-outline-variant bg-surface px-3 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low disabled:pointer-events-none disabled:opacity-50"
                  >
                    <IconUpload size={18} stroke={1.75} />
                    {uploading ? "Hochladen…" : "Hochladen"}
                  </button>
                </>
              ) : null}

              <button
                type="button"
                onClick={() => void deleteSelected()}
                disabled={!canDelete}
                className="inline-flex h-9 items-center gap-1.5 rounded border border-error/40 bg-surface px-3 text-sm font-semibold text-error transition-colors hover:bg-error-container/40 disabled:pointer-events-none disabled:opacity-50"
              >
                <IconTrash size={18} stroke={1.75} />
                Löschen
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

              {scoped ? (
                <button
                  type="button"
                  onClick={closeScoped}
                  disabled={uploading}
                  className="inline-flex h-9 items-center gap-1.5 rounded border border-outline-variant bg-surface px-3 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low disabled:pointer-events-none disabled:opacity-50"
                >
                  <IconX size={18} stroke={1.75} />
                  Schließen
                </button>
              ) : null}
            </>
          )}
        </OptionsActions>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-outline-variant text-xs font-medium tracking-wide text-on-surface-variant uppercase">
              <SortableHeader
                label="Name"
                column="name"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={toggleSort}
              />
              <SortableHeader
                label="Art"
                column="kind"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={toggleSort}
              />
              <SortableHeader
                label="Größe"
                column="size"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={toggleSort}
              />
              <SortableHeader
                label="Datum"
                column="modifiedAt"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={toggleSort}
              />
              <SortableHeader
                label="Bezug"
                column="recordKey"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={toggleSort}
              />
            </tr>
            <tr className="border-b border-outline-variant bg-surface-container-lowest">
              <th className="px-3 py-2 font-normal">
                <ColumnFilterInput
                  label="Name filtern"
                  value={filters.name}
                  onChange={(value) => setFilter("name", value)}
                />
              </th>
              <th className="px-3 py-2 font-normal">
                <ColumnFilterInput
                  label="Art filtern"
                  value={filters.kind}
                  onChange={(value) => setFilter("kind", value)}
                />
              </th>
              <th className="px-3 py-2 font-normal">
                <ColumnFilterInput
                  label="Größe filtern"
                  value={filters.size}
                  onChange={(value) => setFilter("size", value)}
                />
              </th>
              <th className="px-3 py-2 font-normal">
                <ColumnFilterInput
                  label="Datum filtern"
                  value={filters.modifiedAt}
                  onChange={(value) => setFilter("modifiedAt", value)}
                />
              </th>
              <th className="px-3 py-2 font-normal">
                <ColumnFilterInput
                  label="Bezug filtern"
                  value={filters.recordKey}
                  onChange={(value) => setFilter("recordKey", value)}
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-on-surface-variant">
                  Laden…
                </td>
              </tr>
            ) : visibleDocuments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-on-surface-variant">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              visibleDocuments.map((item, index) => {
                const id = documentRowId(item);
                const isSelected = selectedIds.has(id);
                return (
                  <tr
                    key={id}
                    onClick={(event) => selectRow(event, index, id)}
                    onDoubleClick={() => void openDocumentEntry(item)}
                    className={[
                      "cursor-pointer border-b border-outline-variant/70 text-on-surface",
                      isSelected
                        ? "bg-surface-container"
                        : "hover:bg-surface-container-low",
                    ].join(" ")}
                    aria-selected={isSelected}
                  >
                    <td className="px-3 py-3 font-semibold">
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <DocumentFileGlyph
                          app={item.app}
                          recordKey={item.recordKey}
                          name={item.name}
                        />
                        <span className="truncate">{item.name}</span>
                      </span>
                    </td>
                    <td className="px-3 py-3">{documentKind(item.name)}</td>
                    <td className="px-3 py-3">
                      {formatDocumentSize(item.size)}
                    </td>
                    <td className="px-3 py-3">
                      {formatDocumentDate(item.modifiedAt)}
                    </td>
                    <td className="px-3 py-3">{item.recordKey}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {imagePreview ? (
        <DocumentImageLightbox
          url={imagePreview.url}
          name={imagePreview.name}
          onClose={closeImagePreview}
        />
      ) : null}
    </div>
  );
}

function SortableHeader(props: {
  label: string;
  column: SortColumn;
  activeColumn: SortColumn;
  direction: SortDirection;
  onSort: (column: SortColumn) => void;
}) {
  const active = props.activeColumn === props.column;
  const Icon = active
    ? props.direction === "asc"
      ? IconChevronUp
      : IconChevronDown
    : IconSelector;
  return (
    <th className="px-3 py-2">
      <button
        type="button"
        onClick={() => props.onSort(props.column)}
        className={[
          "inline-flex items-center gap-1 uppercase",
          active ? "text-on-surface" : "text-on-surface-variant",
        ].join(" ")}
        aria-sort={
          active
            ? props.direction === "asc"
              ? "ascending"
              : "descending"
            : "none"
        }
      >
        {props.label}
        <Icon
          size={14}
          stroke={1.75}
          className={active ? "opacity-100" : "opacity-40"}
          aria-hidden
        />
      </button>
    </th>
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
