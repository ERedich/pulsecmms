import {
  IconBox,
  IconLink,
  IconPaperclip,
  IconPhoto,
  IconTrash,
  IconUpload,
  IconX,
} from "@tabler/icons-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Combobox } from "../components/Combobox";
import { DocumentFileGlyph } from "../components/DocumentFileGlyph";
import { DocumentImageLightbox } from "../components/DocumentImageLightbox";
import { FloatingField } from "../components/FloatingField";
import { FormSection } from "../components/FormSection";
import { MiscFormSection } from "../components/MiscFormSection";
import { SaveButtonGroup } from "../components/SaveButtonGroup";
import { AppTitle } from "../components/layout/AppTitle";
import { OptionsActions } from "../components/layout/OptionsActions";
import {
  ASSET_TYPES,
  ASSET_TYPE_LABELS,
  ASSET_TYPE_META,
  AssetsApiError,
  assetTypeLabel,
  canHostAssetType,
  createAsset,
  deleteAssetThumbnail,
  getAsset,
  listAssets,
  parentIsRequired,
  updateAsset,
  uploadAssetThumbnail,
  type AssetType,
  type ManagedAsset,
} from "../lib/assets";
import { getStoredUser } from "../lib/auth";
import {
  CostCentersApiError,
  listCostCenters,
  type ManagedCostCenter,
} from "../lib/costCenters";
import {
  DocumentsApiError,
  documentKind,
  formatDocumentSize,
  listDocuments,
  openDocument,
  uploadDocuments,
  type ManagedDocument,
} from "../lib/documents";
import { SearchableField, useRegisterGlobalSearch } from "../lib/globalSearch";
import { setPanelTransitionDirection } from "../lib/panelTransition";

type Mode = "create" | "edit";

const FORM_ID = "asset-form";

type AssetFormLocationState = {
  returnTo?: string;
};

function resolveReturnPath(state: unknown): string {
  if (
    state &&
    typeof state === "object" &&
    "returnTo" in state &&
    typeof (state as AssetFormLocationState).returnTo === "string"
  ) {
    const returnTo = (state as AssetFormLocationState).returnTo;
    if (returnTo === "/asset-tree") return returnTo;
  }
  return "/assets";
}

export function AssetFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  useRegisterGlobalSearch("ep");
  const { key: routeKey } = useParams<{ key: string }>();
  const mode: Mode = routeKey ? "edit" : "create";
  const currentUser = getStoredUser();
  const returnPath = resolveReturnPath(location.state);
  const closeAfterSaveRef = useRef(false);

  const [key, setKey] = useState("");
  const [type, setType] = useState<AssetType>("location");
  const [parentKey, setParentKey] = useState("");
  const [costCenterKey, setCostCenterKey] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [uid, setUid] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [pendingThumbnail, setPendingThumbnail] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(
    null,
  );
  const [thumbnailBusy, setThumbnailBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [assetOptions, setAssetOptions] = useState<ManagedAsset[]>([]);
  const [costCenterOptions, setCostCenterOptions] = useState<
    ManagedCostCenter[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originalKey, setOriginalKey] = useState<string | null>(
    routeKey ?? null,
  );
  const [documents, setDocuments] = useState<ManagedDocument[]>([]);
  const [documentsBusy, setDocumentsBusy] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [imagePreview, setImagePreview] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const dragDepthRef = useRef(0);

  const documentCount = documents.length;

  const refreshDocuments = useCallback(async (assetKey: string) => {
    const docs = await listDocuments({ app: "assets", recordKey: assetKey });
    docs.sort((a, b) => a.name.localeCompare(b.name, "de"));
    setDocuments(docs);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      try {
        const [assets, costCenters] = await Promise.all([
          listAssets(),
          listCostCenters(),
        ]);
        if (cancelled) return;

        setAssetOptions(assets);
        setCostCenterOptions(costCenters);

        if (mode === "edit" && routeKey) {
          const asset = await getAsset(routeKey);
          if (cancelled) return;
          setOriginalKey(asset.key);
          setUid(asset.uid);
          setKey(asset.key);
          setType(asset.type);
          setParentKey(asset.parentKey ?? "");
          setCostCenterKey(asset.costCenterKey);
          setSerialNumber(asset.serialNumber ?? "");
          setManufacturer(asset.manufacturer ?? "");
          setThumbnailUrl(asset.thumbnailUrl);
          setPendingThumbnail(null);

          try {
            const docs = await listDocuments({
              app: "assets",
              recordKey: asset.key,
            });
            docs.sort((a, b) => a.name.localeCompare(b.name, "de"));
            if (!cancelled) setDocuments(docs);
          } catch {
            if (!cancelled) setDocuments([]);
          }
        } else if (!cancelled) {
          setDocuments([]);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof AssetsApiError || err instanceof CostCentersApiError
              ? err.message
              : "Formular konnte nicht geladen werden";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [mode, routeKey]);

  useEffect(() => {
    if (!pendingThumbnail) {
      setPendingPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingThumbnail);
    setPendingPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [pendingThumbnail]);

  const parentRequired = parentIsRequired(type);
  const previewSrc = pendingPreviewUrl ?? thumbnailUrl;

  useEffect(() => {
    setParentKey((current) => {
      if (!current) return current;
      const parent = assetOptions.find((item) => item.key === current);
      if (!parent || !canHostAssetType(parent.type, type)) {
        return "";
      }
      if (originalKey && parent.key === originalKey) {
        return "";
      }
      return current;
    });
  }, [assetOptions, originalKey, type]);

  const typeOptions = useMemo(
    () =>
      ASSET_TYPES.map((value) => {
        const meta = ASSET_TYPE_META[value];
        return {
          value,
          label: meta.label,
          keywords: [value, meta.label],
          color: meta.color,
          icon: meta.icon,
        };
      }),
    [],
  );

  const costCenterComboboxOptions = useMemo(
    () =>
      costCenterOptions.map((item) => ({
        value: item.key,
        label: `${item.key} — ${item.name}`,
        keywords: [item.key, item.name],
      })),
    [costCenterOptions],
  );

  const goBack = useCallback(() => {
    setPanelTransitionDirection("back");
    navigate(returnPath, { viewTransition: true });
  }, [navigate, returnPath]);

  const requestSaveAndClose = useCallback(() => {
    closeAfterSaveRef.current = true;
    const form = document.getElementById(FORM_ID);
    if (form instanceof HTMLFormElement) {
      form.requestSubmit();
    }
  }, []);

  const openDocuments = useCallback(() => {
    if (!originalKey) return;
    setPanelTransitionDirection("forward");
    navigate(`/documents/assets/${encodeURIComponent(originalKey)}`, {
      viewTransition: true,
      state: {
        returnTo: `${location.pathname}${location.search}`,
        returnState: location.state,
      },
    });
  }, [location.pathname, location.search, location.state, navigate, originalKey]);

  const closeImagePreview = useCallback(() => {
    setImagePreview((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
  }, []);

  const openDocumentFile = useCallback(
    async (doc: ManagedDocument) => {
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
    },
    [],
  );

  const uploadDroppedFiles = useCallback(
    async (files: File[]) => {
      if (!originalKey || files.length === 0) return;
      setDocumentsBusy(true);
      setError(null);
      try {
        await uploadDocuments("assets", originalKey, files);
        await refreshDocuments(originalKey);
      } catch (err) {
        setError(
          err instanceof DocumentsApiError
            ? err.message
            : "Dokumente konnten nicht hochgeladen werden",
        );
      } finally {
        setDocumentsBusy(false);
      }
    },
    [originalKey, refreshDocuments],
  );

  const onDocumentDragEnter = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!event.dataTransfer.types.includes("Files")) return;
    dragDepthRef.current += 1;
    setDragActive(true);
  }, []);

  const onDocumentDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setDragActive(false);
    }
  }, []);

  const onDocumentDragOver = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.types.includes("Files")) {
      event.dataTransfer.dropEffect = "copy";
    }
  }, []);

  const onDocumentDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      dragDepthRef.current = 0;
      setDragActive(false);
      if (documentsBusy || submitting) return;
      const files = Array.from(event.dataTransfer.files);
      void uploadDroppedFiles(files);
    },
    [documentsBusy, submitting, uploadDroppedFiles],
  );

  async function onPickThumbnail(file: File | null) {
    if (!file) return;
    setError(null);

    if (mode === "create" || !originalKey) {
      setPendingThumbnail(file);
      return;
    }

    setThumbnailBusy(true);
    try {
      const updated = await uploadAssetThumbnail(originalKey, file);
      setThumbnailUrl(updated.thumbnailUrl);
      setPendingThumbnail(null);
    } catch (err) {
      setError(
        err instanceof AssetsApiError
          ? err.message
          : "Thumbnail konnte nicht hochgeladen werden",
      );
    } finally {
      setThumbnailBusy(false);
    }
  }

  async function onClearThumbnail() {
    setError(null);

    if (mode === "create" || !originalKey) {
      setPendingThumbnail(null);
      setThumbnailUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (!thumbnailUrl && !pendingThumbnail) return;

    setThumbnailBusy(true);
    try {
      if (pendingThumbnail) {
        setPendingThumbnail(null);
      } else {
        const updated = await deleteAssetThumbnail(originalKey);
        setThumbnailUrl(updated.thumbnailUrl);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(
        err instanceof AssetsApiError
          ? err.message
          : "Thumbnail konnte nicht entfernt werden",
      );
    } finally {
      setThumbnailBusy(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const shouldClose = closeAfterSaveRef.current;
    closeAfterSaveRef.current = false;
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        key: key.trim(),
        type,
        parentKey: parentRequired ? parentKey.trim() || null : null,
        costCenterKey: costCenterKey.trim(),
        serialNumber: serialNumber.trim(),
        manufacturer: manufacturer.trim(),
      };

      const previousKey = originalKey ?? routeKey ?? payload.key;
      let saved =
        mode === "create"
          ? await createAsset(payload)
          : await updateAsset(previousKey, payload);

      if (pendingThumbnail) {
        saved = await uploadAssetThumbnail(saved.key, pendingThumbnail);
        setPendingThumbnail(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }

      if (shouldClose) {
        setPanelTransitionDirection("back");
        navigate(returnPath, { replace: true, viewTransition: true });
        return;
      }

      setOriginalKey(saved.key);
      setUid(saved.uid);
      setKey(saved.key);
      setType(saved.type);
      setParentKey(saved.parentKey ?? "");
      setCostCenterKey(saved.costCenterKey);
      setSerialNumber(saved.serialNumber ?? "");
      setManufacturer(saved.manufacturer ?? "");
      setThumbnailUrl(saved.thumbnailUrl);

      if (mode === "create" || previousKey !== saved.key) {
        navigate(`/assets/${encodeURIComponent(saved.key)}/edit`, {
          replace: true,
          state: location.state,
        });
      }
    } catch (err) {
      setError(
        err instanceof AssetsApiError
          ? err.message
          : "Speichern ist fehlgeschlagen",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const pageTitle =
    mode === "create" ? "Asset anlegen" : "Asset bearbeiten";

  return (
    <div className="panel-transition">
      <div className="@container flex h-16 w-full items-center gap-3 border-b border-outline-variant px-3">
        <AppTitle title={pageTitle} />

        <div className="h-5 w-px shrink-0 bg-outline-variant" aria-hidden />

        <OptionsActions
          label="Formular-Aktionen"
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
              <SaveButtonGroup
                formId={FORM_ID}
                disabled={loading || thumbnailBusy}
                submitting={submitting}
                onSaveAndClose={requestSaveAndClose}
              />

              {mode === "edit" && originalKey ? (
                <button
                  type="button"
                  onClick={openDocuments}
                  disabled={loading || submitting || thumbnailBusy}
                  className="inline-flex h-9 items-center gap-1.5 rounded border border-outline-variant bg-surface px-3 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low disabled:pointer-events-none disabled:opacity-50"
                >
                  <IconPaperclip size={18} stroke={1.75} />
                  Dokumente
                  <span
                    className={[
                      "grid transition-[grid-template-columns] duration-200 ease-out motion-reduce:transition-none",
                      documentCount > 0 ? "grid-cols-[1fr]" : "grid-cols-[0fr]",
                    ].join(" ")}
                    aria-hidden={documentCount === 0}
                  >
                    <span className="min-w-0 overflow-hidden">
                      <span className="ml-0.5 inline-flex min-w-4 items-center justify-center rounded bg-surface-container-high px-1 text-[10px] leading-4 font-semibold text-on-surface-variant">
                        {documentCount > 0 ? documentCount : "\u00a0"}
                      </span>
                    </span>
                  </span>
                </button>
              ) : null}

              <button
                type="button"
                onClick={goBack}
                disabled={submitting}
                className="inline-flex h-9 items-center gap-1.5 rounded border border-outline-variant bg-surface px-3 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low disabled:pointer-events-none disabled:opacity-50"
              >
                <IconX size={18} stroke={1.75} />
                Abbrechen
              </button>
            </>
          )}
        </OptionsActions>
      </div>

      {loading ? (
        <p className="mt-8 px-3 text-sm text-on-surface-variant">Laden…</p>
      ) : (
        <form
          id={FORM_ID}
          className="mt-8 flex w-full flex-col gap-8 px-3"
          onSubmit={onSubmit}
        >
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
            <FormSection
              headingId="asset-thumbnail-heading"
              title="Thumbnail"
              icon={IconPhoto}
              className="w-full shrink-0 lg:w-64"
            >
              <SearchableField texts={["Thumbnail", "Bild"]} className="w-full">
                <div className="flex flex-col gap-2">
                  {previewSrc ? (
                    <img
                      src={previewSrc}
                      alt="Asset-Thumbnail"
                      className="aspect-square w-full rounded border border-outline-variant object-cover"
                    />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center rounded border border-outline-variant/70 bg-surface-container-low text-sm text-on-surface-variant">
                      —
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    id="asset-thumbnail-file"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      void onPickThumbnail(file);
                    }}
                  />
                  <div className="flex h-9 w-full overflow-hidden rounded border border-outline-variant bg-surface">
                    <button
                      type="button"
                      disabled={submitting || thumbnailBusy}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex h-full min-w-0 flex-1 items-center justify-center gap-1.5 px-3 text-sm font-semibold whitespace-nowrap text-on-surface transition-colors hover:bg-surface-container-low disabled:pointer-events-none disabled:opacity-50"
                    >
                      <IconUpload size={18} stroke={1.75} className="shrink-0" />
                      {thumbnailBusy ? "Laden…" : "Bild wählen"}
                    </button>
                    <span
                      className="my-1.5 w-px shrink-0 bg-outline-variant"
                      aria-hidden
                    />
                    <button
                      type="button"
                      disabled={
                        submitting ||
                        thumbnailBusy ||
                        (!previewSrc && !pendingThumbnail)
                      }
                      onClick={() => void onClearThumbnail()}
                      className="inline-flex h-full shrink-0 items-center justify-center gap-1.5 px-3 text-sm font-semibold whitespace-nowrap text-error transition-colors hover:bg-error-container/40 disabled:pointer-events-none disabled:opacity-50"
                    >
                      <IconTrash size={18} stroke={1.75} className="shrink-0" />
                      Entfernen
                    </button>
                  </div>
                  <p className="text-xs text-on-surface-variant">
                    JPEG, PNG oder WebP, max. 2 MB
                  </p>
                </div>
              </SearchableField>
            </FormSection>

            <FormSection
              headingId="asset-base-heading"
              title="Basis Informationen"
              icon={IconBox}
              className="min-w-0 flex-1"
            >
            <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              <Field
                id="asset-key"
                label="Schlüssel"
                value={key}
                onChange={setKey}
                required
                autoComplete="off"
              />
              <SearchableField
                texts={[
                  "Typ",
                  assetTypeLabel(type),
                  ...ASSET_TYPES.map((value) => ASSET_TYPE_LABELS[value]),
                ]}
              >
                <Combobox
                  id="asset-type"
                  label="Typ"
                  value={type}
                  onChange={(value) => setType(value as AssetType)}
                  options={typeOptions}
                  required
                />
              </SearchableField>
              <Field
                id="asset-serial-number"
                label="Seriennummer"
                value={serialNumber}
                onChange={setSerialNumber}
                autoComplete="off"
              />
              <Field
                id="asset-manufacturer"
                label="Hersteller"
                value={manufacturer}
                onChange={setManufacturer}
                autoComplete="off"
              />
            </div>
            </FormSection>
          </div>

          <FormSection
            headingId="asset-references-heading"
            title="Referenzen"
            icon={IconLink}
          >
            <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              <SearchableField
                texts={[
                  "Kostenstelle",
                  costCenterKey,
                  ...costCenterOptions.flatMap((item) => [item.key, item.name]),
                ]}
              >
                <Combobox
                  id="asset-cost-center"
                  label="Kostenstelle"
                  value={costCenterKey}
                  onChange={setCostCenterKey}
                  options={costCenterComboboxOptions}
                  required
                  emptyText={
                    costCenterOptions.length === 0
                      ? "Keine Kostenstellen verfügbar."
                      : "Keine Treffer"
                  }
                />
              </SearchableField>
            </div>
          </FormSection>

          {mode === "edit" && originalKey ? (
            <FormSection
              headingId="asset-documents-heading"
              title={
                <>
                  Dokumente
                  <span className="normal-case tracking-normal text-on-surface-variant">
                    {" "}
                    [{documentCount}]
                  </span>
                  {documentsBusy ? (
                    <span className="normal-case tracking-normal text-on-surface-variant">
                      {" "}
                      · Hochladen…
                    </span>
                  ) : null}
                </>
              }
              icon={IconPaperclip}
              defaultOpen={false}
              className={[
                "rounded border border-transparent p-1 -m-1 transition-colors",
                dragActive
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onDragEnter={onDocumentDragEnter}
              onDragLeave={onDocumentDragLeave}
              onDragOver={onDocumentDragOver}
              onDrop={onDocumentDrop}
            >
              {documents.length === 0 ? (
                <p className="px-1 py-6 text-center text-sm text-on-surface-variant">
                  Keine Dokumente — Dateien hierher ziehen.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-outline-variant/70 border-y border-outline-variant/70">
                  {documents.map((doc) => (
                    <li key={doc.name}>
                      <SearchableField
                        texts={[
                          "Dokumente",
                          doc.name,
                          documentKind(doc.name),
                          formatDocumentSize(doc.size),
                        ]}
                      >
                        <button
                          type="button"
                          onClick={() => void openDocumentFile(doc)}
                          disabled={documentsBusy || submitting}
                          className="flex w-full items-center gap-3 px-1 py-2.5 text-left text-sm text-on-surface transition-colors hover:bg-surface-container-low disabled:pointer-events-none disabled:opacity-50"
                        >
                          <DocumentFileGlyph
                            app={doc.app}
                            recordKey={doc.recordKey}
                            name={doc.name}
                          />
                          <span className="min-w-0 flex-1 truncate font-semibold">
                            {doc.name}
                          </span>
                          <span className="shrink-0 text-on-surface-variant">
                            {documentKind(doc.name)}
                          </span>
                          <span className="w-20 shrink-0 text-right text-on-surface-variant">
                            {formatDocumentSize(doc.size)}
                          </span>
                        </button>
                      </SearchableField>
                    </li>
                  ))}
                </ul>
              )}
            </FormSection>
          ) : null}

          <MiscFormSection
            headingId="asset-misc-heading"
            uid={uid}
            site={currentUser?.primarySite ?? null}
          />
        </form>
      )}

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

function Field(props: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <SearchableField texts={[props.label, props.value]}>
      <FloatingField
        id={props.id}
        label={props.label}
        value={props.value}
        onChange={props.onChange}
        required={props.required}
        autoComplete={props.autoComplete}
      />
    </SearchableField>
  );
}
