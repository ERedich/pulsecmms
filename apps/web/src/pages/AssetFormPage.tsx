import {
  IconBox,
  IconBuilding,
  IconDeviceFloppy,
  IconLink,
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
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Combobox } from "../components/Combobox";
import { FloatingField } from "../components/FloatingField";
import { OptionsActions } from "../components/layout/OptionsActions";
import {
  ASSET_TYPES,
  ASSET_TYPE_LABELS,
  ASSET_TYPE_META,
  AssetsApiError,
  assetTypeLabel,
  assetTypeMeta,
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
import { SearchableField, useRegisterGlobalSearch } from "../lib/globalSearch";
import { setPanelTransitionDirection } from "../lib/panelTransition";

type Mode = "create" | "edit";

export function AssetFormPage() {
  const navigate = useNavigate();
  useRegisterGlobalSearch("ep");
  const { key: routeKey } = useParams<{ key: string }>();
  const mode: Mode = routeKey ? "edit" : "create";
  const currentUser = getStoredUser();

  const [key, setKey] = useState("");
  const [type, setType] = useState<AssetType>("location");
  const [parentKey, setParentKey] = useState("");
  const [costCenterKey, setCostCenterKey] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [manufacturer, setManufacturer] = useState("");
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
          setKey(asset.key);
          setType(asset.type);
          setParentKey(asset.parentKey ?? "");
          setCostCenterKey(asset.costCenterKey);
          setSerialNumber(asset.serialNumber ?? "");
          setManufacturer(asset.manufacturer ?? "");
          setThumbnailUrl(asset.thumbnailUrl);
          setPendingThumbnail(null);
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

  const parentOptions = useMemo(() => {
    return assetOptions
      .filter(
        (item) =>
          item.key !== (originalKey ?? undefined) &&
          canHostAssetType(item.type, type),
      )
      .map((item) => {
        const meta = assetTypeMeta(item.type);
        return {
          value: item.key,
          label: `${item.key} — ${meta.label}`,
          keywords: [item.key, meta.label],
          color: meta.color,
          icon: meta.icon,
        };
      });
  }, [assetOptions, originalKey, type]);

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
    navigate("/assets", { viewTransition: true });
  }, [navigate]);

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
      let savedKey = payload.key;
      if (mode === "create") {
        const created = await createAsset(payload);
        savedKey = created.key;
        if (pendingThumbnail) {
          await uploadAssetThumbnail(savedKey, pendingThumbnail);
        }
      } else {
        await updateAsset(previousKey, payload);
        if (pendingThumbnail) {
          await uploadAssetThumbnail(previousKey, pendingThumbnail);
        }
      }

      setPanelTransitionDirection("back");
      navigate("/assets", { replace: true, viewTransition: true });
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

  const primaryLabel = currentUser
    ? `${currentUser.primarySite.key} — ${currentUser.primarySite.name}`
    : "—";

  const pageTitle =
    mode === "create" ? "Asset anlegen" : "Asset bearbeiten";

  return (
    <div className="panel-transition">
      <div className="@container flex h-16 w-full items-center gap-3 border-b border-outline-variant px-3">
        <h1 className="w-52 shrink-0 truncate text-lg leading-6 font-semibold text-on-surface">
          {pageTitle}
        </h1>

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
              <button
                type="submit"
                form="asset-form"
                disabled={loading || submitting || thumbnailBusy}
                className="inline-flex h-9 items-center gap-1.5 rounded border border-primary bg-primary px-3 text-sm font-semibold text-on-primary transition-colors hover:border-primary-container hover:bg-primary-container disabled:pointer-events-none disabled:opacity-50"
              >
                <IconDeviceFloppy size={18} stroke={1.75} />
                {submitting ? "Speichern…" : "Speichern"}
              </button>

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
          id="asset-form"
          className="mt-8 flex w-full flex-col gap-8 px-3"
          onSubmit={onSubmit}
        >
          <section
            aria-labelledby="asset-base-heading"
            className="flex flex-col gap-4"
          >
            <h2
              id="asset-base-heading"
              className="flex items-center gap-2 border-b border-outline-variant pb-2 text-sm font-semibold tracking-wide text-on-surface uppercase"
            >
              <IconBox size={18} stroke={1.75} className="text-primary" />
              Basis Informationen
            </h2>
            <div className="flex w-full flex-col gap-5 lg:flex-row lg:items-start">
              <SearchableField
                texts={["Thumbnail", "Bild"]}
                className="w-full shrink-0 lg:w-44"
              >
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
                  <button
                    type="button"
                    disabled={submitting || thumbnailBusy}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded border border-outline-variant bg-surface px-3 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low disabled:pointer-events-none disabled:opacity-50"
                  >
                    <IconUpload size={18} stroke={1.75} />
                    {thumbnailBusy ? "Laden…" : "Bild wählen"}
                  </button>
                  <button
                    type="button"
                    disabled={
                      submitting ||
                      thumbnailBusy ||
                      (!previewSrc && !pendingThumbnail)
                    }
                    onClick={() => void onClearThumbnail()}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded border border-error/40 bg-surface px-3 text-sm font-semibold text-error transition-colors hover:bg-error-container/40 disabled:pointer-events-none disabled:opacity-50"
                  >
                    <IconTrash size={18} stroke={1.75} />
                    Entfernen
                  </button>
                  <p className="text-xs text-on-surface-variant">
                    JPEG, PNG oder WebP, max. 2 MB
                  </p>
                </div>
              </SearchableField>

              <div className="grid min-w-0 flex-1 grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
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
            </div>
          </section>

          <section
            aria-labelledby="asset-references-heading"
            className="flex flex-col gap-4"
          >
            <h2
              id="asset-references-heading"
              className="flex items-center gap-2 border-b border-outline-variant pb-2 text-sm font-semibold tracking-wide text-on-surface uppercase"
            >
              <IconLink size={18} stroke={1.75} className="text-primary" />
              Referenzen
            </h2>
            <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              <SearchableField
                texts={[
                  "Bezug",
                  parentKey,
                  ...parentOptions.flatMap((option) => [
                    option.value,
                    option.label,
                  ]),
                ]}
              >
                <Combobox
                  id="asset-parent"
                  label="Bezug"
                  value={parentKey}
                  onChange={setParentKey}
                  options={parentOptions}
                  required={parentRequired}
                  emptyText={
                    parentOptions.length === 0
                      ? parentRequired
                        ? "Keine passenden Eltern-Assets verfügbar."
                        : "Kein Bezug möglich."
                      : "Keine Treffer"
                  }
                />
              </SearchableField>
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
          </section>

          <section
            aria-labelledby="asset-site-heading"
            className="flex flex-col gap-4"
          >
            <h2
              id="asset-site-heading"
              className="flex items-center gap-2 border-b border-outline-variant pb-2 text-sm font-semibold tracking-wide text-on-surface uppercase"
            >
              <IconBuilding
                size={18}
                stroke={1.75}
                className="text-primary"
              />
              Mandant
            </h2>
            <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              <SearchableField texts={["Mandant", primaryLabel]}>
                <span className="mb-1.5 block text-xs font-medium leading-4 text-on-surface-variant">
                  Mandant
                </span>
                <p className="rounded border border-outline-variant/70 bg-surface-container-low px-3.5 py-2.5 text-sm text-on-surface">
                  {primaryLabel}
                </p>
              </SearchableField>
            </div>
          </section>
        </form>
      )}
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
