import {
  IconBuilding,
  IconDeviceFloppy,
  IconPalette,
  IconX,
} from "@tabler/icons-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FloatingField } from "../components/FloatingField";
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

  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [colorCode, setColorCode] = useState(DEFAULT_COLOR);
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

  function onColorPickerChange(value: string) {
    setColorCode(value.toUpperCase());
  }

  function onHexChange(value: string) {
    setColorCode(normalizeHexInput(value).toUpperCase());
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
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
        syncStoredUserSites(saved, previousKey);
      }

      setPanelTransitionDirection("back");
      navigate("/sites", { replace: true, viewTransition: true });
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
                form="site-form"
                disabled={loading || submitting}
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
          id="site-form"
          className="mt-8 flex w-full flex-col gap-8 px-3"
          onSubmit={onSubmit}
        >
          <section
            aria-labelledby="site-base-heading"
            className="flex flex-col gap-4"
          >
            <h2
              id="site-base-heading"
              className="flex items-center gap-2 border-b border-outline-variant pb-2 text-sm font-semibold tracking-wide text-on-surface uppercase"
            >
              <IconBuilding size={18} stroke={1.75} className="text-primary" />
              Basis Informationen
            </h2>
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
          </section>

          <section
            aria-labelledby="site-misc-heading"
            className="flex flex-col gap-4"
          >
            <h2
              id="site-misc-heading"
              className="flex items-center gap-2 border-b border-outline-variant pb-2 text-sm font-semibold tracking-wide text-on-surface uppercase"
            >
              <IconPalette size={18} stroke={1.75} className="text-primary" />
              Sonstiges
            </h2>
            <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
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
