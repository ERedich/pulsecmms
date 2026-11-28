import { IconAdjustments, IconInfoCircle, IconX } from "@tabler/icons-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FloatingField } from "../components/FloatingField";
import { FormSection } from "../components/FormSection";
import { MiscFormSection } from "../components/MiscFormSection";
import { SaveButtonGroup } from "../components/SaveButtonGroup";
import { AppTitle } from "../components/layout/AppTitle";
import { OptionsActions } from "../components/layout/OptionsActions";
import { getStoredUser } from "../lib/auth";
import { SearchableField, useRegisterGlobalSearch } from "../lib/globalSearch";
import { setPanelTransitionDirection } from "../lib/panelTransition";
import {
  getSetting,
  SettingsApiError,
  updateSetting,
  type SettingCategory,
} from "../lib/settings";

const FORM_ID = "setting-form";

function parseCategory(raw: string | null): SettingCategory {
  if (raw === "lists" || raw === "orders" || raw === "general") {
    return raw;
  }
  return "general";
}

function listPath(category: SettingCategory): string {
  if (category === "general") return "/settings";
  return `/settings?category=${category}`;
}

export function SettingFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  useRegisterGlobalSearch("ep");
  const { key: routeKey } = useParams<{ key: string }>();
  const currentUser = getStoredUser();
  const returnCategory = parseCategory(searchParams.get("category"));
  const closeAfterSaveRef = useRef(false);

  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [explanation, setExplanation] = useState("");
  const [valueText, setValueText] = useState("");
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const returnTo = useMemo(() => listPath(returnCategory), [returnCategory]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!routeKey) {
        setError("Einstellung nicht gefunden");
        setLoading(false);
        return;
      }

      setError(null);
      try {
        const setting = await getSetting(routeKey);
        if (cancelled) return;
        setKey(setting.key);
        setName(setting.name);
        setDescription(setting.description);
        setExplanation(setting.explanation);
        setValueText(String(setting.value));
        setUid(setting.uid);

      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof SettingsApiError
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
  }, [routeKey]);

  const goBack = useCallback(() => {
    setPanelTransitionDirection("back");
    navigate(returnTo, { viewTransition: true });
  }, [navigate, returnTo]);

  const requestSaveAndClose = useCallback(() => {
    closeAfterSaveRef.current = true;
    const form = document.getElementById(FORM_ID);
    if (form instanceof HTMLFormElement) {
      form.requestSubmit();
    }
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!routeKey) return;

    const shouldClose = closeAfterSaveRef.current;
    closeAfterSaveRef.current = false;
    setError(null);
    setSubmitting(true);

    try {
      const parsed = Number(valueText.trim().replace(",", "."));
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new SettingsApiError(
          "Wert muss eine Zahl größer als 0 sein",
          400,
        );
      }

      const saved = await updateSetting(routeKey, parsed);
      setValueText(String(saved.value));

      if (shouldClose) {
        setPanelTransitionDirection("back");
        navigate(returnTo, { replace: true, viewTransition: true });
      }
    } catch (err) {
      setError(
        err instanceof SettingsApiError
          ? err.message
          : "Speichern ist fehlgeschlagen",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="panel-transition">
      <div className="@container flex h-16 w-full items-center gap-3 border-b border-outline-variant px-3">
        <AppTitle title="Einstellung bearbeiten" />

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
                disabled={loading || !key}
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
            headingId="setting-parameter-heading"
            title="Parameter"
            icon={IconAdjustments}
          >
            <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              <ReadOnlyField
                id="setting-key"
                label="Schlüssel"
                value={key}
              />
              <ReadOnlyField id="setting-name" label="Name" value={name} />
              <ReadOnlyField
                id="setting-description"
                label="Beschreibung"
                value={description}
              />
              <SearchableField texts={["Wert", valueText]}>
                <FloatingField
                  id="setting-value"
                  label="Wert"
                  type="number"
                  min={0}
                  step="any"
                  value={valueText}
                  onChange={setValueText}
                  required
                  autoComplete="off"
                  hint="Zahl größer als 0"
                />
              </SearchableField>
            </div>
          </FormSection>

          <FormSection
            headingId="setting-explanation-heading"
            title="Erläuterung"
            icon={IconInfoCircle}
          >
            <SearchableField texts={["Erläuterung", explanation]}>
              <p className="text-sm leading-6 whitespace-pre-wrap text-on-surface">
                {explanation || "—"}
              </p>
            </SearchableField>
          </FormSection>

          <MiscFormSection
            headingId="setting-misc-heading"
            uid={uid}
            site={currentUser?.primarySite ?? null}
          />
        </form>
      )}
    </div>
  );
}

function ReadOnlyField(props: {
  id: string;
  label: string;
  value: string;
}) {
  return (
    <SearchableField texts={[props.label, props.value]}>
      <FloatingField
        id={props.id}
        label={props.label}
        value={props.value || "—"}
        readOnly
      />
    </SearchableField>
  );
}
