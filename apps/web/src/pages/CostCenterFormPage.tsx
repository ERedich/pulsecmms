import { IconCash, IconX } from "@tabler/icons-react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FloatingField } from "../components/FloatingField";
import { FormSection } from "../components/FormSection";
import { MiscFormSection } from "../components/MiscFormSection";
import { SaveButtonGroup } from "../components/SaveButtonGroup";
import { AppTitle } from "../components/layout/AppTitle";
import { OptionsActions } from "../components/layout/OptionsActions";
import { getStoredUser } from "../lib/auth";
import {
  CostCentersApiError,
  createCostCenter,
  getCostCenter,
  updateCostCenter,
} from "../lib/costCenters";
import { SearchableField, useRegisterGlobalSearch } from "../lib/globalSearch";
import { setPanelTransitionDirection } from "../lib/panelTransition";

type Mode = "create" | "edit";

const FORM_ID = "cost-center-form";

export function CostCenterFormPage() {
  const navigate = useNavigate();
  useRegisterGlobalSearch("ep");
  const { key: routeKey } = useParams<{ key: string }>();
  const mode: Mode = routeKey ? "edit" : "create";
  const currentUser = getStoredUser();
  const closeAfterSaveRef = useRef(false);

  const [key, setKey] = useState("");
  const [name, setName] = useState("");
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
        const costCenter = await getCostCenter(routeKey);
        if (cancelled) return;
        setOriginalKey(costCenter.key);
        setUid(costCenter.uid);
        setKey(costCenter.key);
        setName(costCenter.name);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof CostCentersApiError
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
    navigate("/cost-centers", { viewTransition: true });
  }, [navigate]);

  const requestSaveAndClose = useCallback(() => {
    closeAfterSaveRef.current = true;
    const form = document.getElementById(FORM_ID);
    if (form instanceof HTMLFormElement) {
      form.requestSubmit();
    }
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const shouldClose = closeAfterSaveRef.current;
    closeAfterSaveRef.current = false;
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        key: key.trim(),
        name: name.trim(),
      };

      const previousKey = originalKey ?? routeKey ?? payload.key;
      const saved =
        mode === "create"
          ? await createCostCenter(payload)
          : await updateCostCenter(previousKey, payload);

      if (shouldClose) {
        setPanelTransitionDirection("back");
        navigate("/cost-centers", { replace: true, viewTransition: true });
        return;
      }

      setOriginalKey(saved.key);
      setUid(saved.uid);
      setKey(saved.key);
      setName(saved.name);

      if (mode === "create" || previousKey !== saved.key) {
        navigate(`/cost-centers/${encodeURIComponent(saved.key)}/edit`, {
          replace: true,
        });
      }
    } catch (err) {
      setError(
        err instanceof CostCentersApiError
          ? err.message
          : "Speichern ist fehlgeschlagen",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const pageTitle =
    mode === "create" ? "Kostenstelle anlegen" : "Kostenstelle bearbeiten";

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
            headingId="cost-center-base-heading"
            title="Basis Informationen"
            icon={IconCash}
          >
            <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              <Field
                id="cost-center-key"
                label="Schlüssel"
                value={key}
                onChange={setKey}
                required
                autoComplete="off"
              />
              <Field
                id="cost-center-name"
                label="Name"
                value={name}
                onChange={setName}
                required
                autoComplete="off"
              />
            </div>
          </FormSection>

          <MiscFormSection
            headingId="cost-center-misc-heading"
            uid={uid}
            site={currentUser?.primarySite ?? null}
          />
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
