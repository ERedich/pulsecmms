import {
  IconBuilding,
  IconDeviceFloppy,
  IconIdBadge2,
  IconX,
} from "@tabler/icons-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FloatingField } from "../components/FloatingField";
import { OptionsActions } from "../components/layout/OptionsActions";
import { getStoredUser } from "../lib/auth";
import {
  EmployeesApiError,
  createEmployee,
  getEmployee,
  updateEmployee,
} from "../lib/employees";
import { SearchableField, useRegisterGlobalSearch } from "../lib/globalSearch";
import { setPanelTransitionDirection } from "../lib/panelTransition";

type Mode = "create" | "edit";

export function EmployeeFormPage() {
  const navigate = useNavigate();
  useRegisterGlobalSearch("ep");
  const { key: routeKey } = useParams<{ key: string }>();
  const mode: Mode = routeKey ? "edit" : "create";
  const currentUser = getStoredUser();

  const [key, setKey] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
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
        const employee = await getEmployee(routeKey);
        if (cancelled) return;
        setOriginalKey(employee.key);
        setKey(employee.key);
        setFirstName(employee.firstName);
        setLastName(employee.lastName);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof EmployeesApiError
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
    navigate("/employees", { viewTransition: true });
  }, [navigate]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        key: key.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      };

      const previousKey = originalKey ?? routeKey ?? payload.key;
      if (mode === "create") {
        await createEmployee(payload);
      } else {
        await updateEmployee(previousKey, payload);
      }

      setPanelTransitionDirection("back");
      navigate("/employees", { replace: true, viewTransition: true });
    } catch (err) {
      setError(
        err instanceof EmployeesApiError
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
    mode === "create" ? "Mitarbeiter anlegen" : "Mitarbeiter bearbeiten";

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
                form="employee-form"
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
          id="employee-form"
          className="mt-8 flex w-full flex-col gap-8 px-3"
          onSubmit={onSubmit}
        >
          <section
            aria-labelledby="employee-base-heading"
            className="flex flex-col gap-4"
          >
            <h2
              id="employee-base-heading"
              className="flex items-center gap-2 border-b border-outline-variant pb-2 text-sm font-semibold tracking-wide text-on-surface uppercase"
            >
              <IconIdBadge2 size={18} stroke={1.75} className="text-primary" />
              Basis Informationen
            </h2>
            <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              <Field
                id="employee-key"
                label="Schlüssel"
                value={key}
                onChange={setKey}
                required
                autoComplete="off"
              />
              <Field
                id="employee-first-name"
                label="Vorname"
                value={firstName}
                onChange={setFirstName}
                required
                autoComplete="given-name"
              />
              <Field
                id="employee-last-name"
                label="Nachname"
                value={lastName}
                onChange={setLastName}
                required
                autoComplete="family-name"
              />
            </div>
          </section>

          <section
            aria-labelledby="employee-site-heading"
            className="flex flex-col gap-4"
          >
            <h2
              id="employee-site-heading"
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
