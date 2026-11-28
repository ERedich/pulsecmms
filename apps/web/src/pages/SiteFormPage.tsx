import { IconBuilding, IconPalette, IconX } from "@tabler/icons-react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FloatingField } from "../components/FloatingField";
import { FormSection } from "../components/FormSection";
import { MiscFormSection } from "../components/MiscFormSection";
import { SaveButtonGroup } from "../components/SaveButtonGroup";
import { AppTitle } from "../components/layout/AppTitle";
import { OptionsActions } from "../components/layout/OptionsActions";
import { syncStoredUserSites } from "../lib/auth";
import { SearchableField, useRegisterGlobalSearch } from "../lib/globalSearch";
import { setPanelTransitionDirection } from "../lib/panelTransition";
import {
  createSite,
  getSite,
  SitesApiError,
  updateSite,
} from "../lib/sites";

type Mode = "create" | "edit";

const FORM_ID = "site-form";
const DEFAULT_COLOR = "#2563EB";
const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

function normalizeHexInput(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) return "";
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

export function SiteFormPage() {
  const navigate = useNavigate();
  useRegisterGlobalSearch("ep");
  const { key: routeKey } = useParams<{ key: string }>();
  const mode: Mode = routeKey ? "edit" : "create";
  const closeAfterSaveRef = useRef(false);

  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [colorCode, setColorCode] = useState(DEFAULT_COLOR);
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(mode === "edit");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originalKey, setOriginalKey] = useState<string | null>(
    routeKey ?? null,
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (mode !== "edit" || !routeKey) {
        setLoading(false);
        return;
      }

      setError(null);
      try {
        const site = await getSite(routeKey);
        if (cancelled) return;
        setOriginalKey(site.key);
        setUid(site.uid);
        setKey(site.key);
        setName(site.name);
        setColorCode(site.colorCode);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof SitesApiError
              ? err.message
              : "Formular konnte nicht geladen werden",
          );
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

  const goBack = useCallback(() => {
    setPanelTransitionDirection("back");
    navigate("/sites", { viewTransition: true });
  }, [navigate]);

  const requestSaveAndClose = useCallback(() => {
    closeAfterSaveRef.current = true;
    const form = document.getElementById(FORM_ID);
    if (form instanceof HTMLFormElement) {
      form.requestSubmit();
    }
  }, []);

  function onColorPickerChange(value: string) {
    setColorCode(value.toUpperCase());
  }

  function onHexChange(value: string) {
    setColorCode(normalizeHexInput(value).toUpperCase());
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const shouldClose = closeAfterSaveRef.current;
    closeAfterSaveRef.current = false;
    setError(null);

    const normalizedColor = colorCode.trim().toUpperCase();
    if (!HEX_PATTERN.test(normalizedColor)) {
      setError("Farbcode muss das Format #RRGGBB haben");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        key: key.trim(),
        name: name.trim(),
        colorCode: normalizedColor,
      };

      const previousKey = originalKey ?? routeKey ?? payload.key;
      const saved =
        mode === "create"
          ? await createSite(payload)
          : await updateSite(previousKey, payload);

      if (mode === "edit") {
        syncStoredUserSites(
          {
            key: saved.key,
            name: saved.name,
            colorCode: saved.colorCode,
          },
          previousKey,
        );
      }

      if (shouldClose) {
        setPanelTransitionDirection("back");
        navigate("/sites", { replace: true, viewTransition: true });
        return;
      }

      setOriginalKey(saved.key);
      setUid(saved.uid);
      setKey(saved.key);
      setName(saved.name);
      setColorCode(saved.colorCode);

      if (mode === "create" || previousKey !== saved.key) {
        navigate(`/sites/${encodeURIComponent(saved.key)}/edit`, {
          replace: true,
        });
      }
    } catch (err) {
      setError(
        err instanceof SitesApiError
          ? err.message
          : "Speichern ist fehlgeschlagen",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const pageTitle =
    mode === "create" ? "Mandant anlegen" : "Mandant bearbeiten";

  const pickerValue = HEX_PATTERN.test(colorCode) ? colorCode : DEFAULT_COLOR;

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
                disabled={loading}
                submitting={submitting}
                onSaveAndClose={requestSaveAndClose}
              />

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
          <FormSection
            headingId="site-base-heading"
            title="Basis Informationen"
            icon={IconBuilding}
          >
            <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              <Field
                id="site-key"
                label="Schlüssel"
                value={key}
                onChange={setKey}
                required
                autoComplete="off"
              />
              <Field
                id="site-name"
                label="Name"
                value={name}
                onChange={setName}
                required
                autoComplete="organization"
              />
            </div>
          </FormSection>

          <MiscFormSection
            headingId="site-misc-heading"
            uid={uid}
            icon={IconPalette}
          >
            <SearchableField texts={["Farbcode", colorCode]}>
              <div>
                <span className="mb-1.5 block text-xs font-medium leading-4 text-on-surface-variant">
                  Farbcode
                  <span className="ml-0.5 text-error" aria-hidden>
                    *
                  </span>
                </span>
                <div className="flex items-center gap-3">
                  <input
                    id="site-color-picker"
                    type="color"
                    value={pickerValue}
                    onChange={(event) =>
                      onColorPickerChange(event.target.value)
                    }
                    required
                    aria-label="Farbe wählen"
                    className="h-11 w-14 shrink-0 cursor-pointer rounded border border-error/60 bg-surface-container-lowest p-1 focus:border-error focus:ring-1 focus:ring-error focus:outline-none"
                  />
                  <FloatingField
                    id="site-color-hex"
                    label="Hex"
                    value={colorCode}
                    onChange={onHexChange}
                    required
                    autoComplete="off"
                    inputClassName="font-mono uppercase"
                  />
                </div>
              </div>
            </SearchableField>
          </MiscFormSection>
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
