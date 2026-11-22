import {
  IconBuilding,
  IconDeviceFloppy,
  IconEye,
  IconEyeOff,
  IconId,
  IconLink,
  IconX,
} from "@tabler/icons-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Combobox } from "../components/Combobox";
import { FloatingField } from "../components/FloatingField";
import { MultiSelect } from "../components/MultiSelect";
import { OptionsActions } from "../components/layout/OptionsActions";
import {
  getStoredUser,
  updateStoredUser,
  type SiteRef,
} from "../lib/auth";
import { SearchableField, useRegisterGlobalSearch } from "../lib/globalSearch";
import { setPanelTransitionDirection } from "../lib/panelTransition";
import {
  createUser,
  getUser,
  listEmployeeOptions,
  listSiteOptions,
  updateUser,
  UsersApiError,
  type EmployeeOption,
} from "../lib/users";

type Mode = "create" | "edit";

export function UserFormPage() {
  const navigate = useNavigate();
  useRegisterGlobalSearch("ep");
  const { key: routeKey } = useParams<{ key: string }>();
  const mode: Mode = routeKey ? "edit" : "create";
  const currentUser = getStoredUser();

  const [key, setKey] = useState("");
  const [loginName, setLoginName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [secondarySiteKeys, setSecondarySiteKeys] = useState<string[]>([]);
  const [siteOptions, setSiteOptions] = useState<SiteRef[]>([]);
  const [employeeKey, setEmployeeKey] = useState<string>("");
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(mode === "edit");
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
        const [sites, employees] = await Promise.all([
          listSiteOptions(),
          listEmployeeOptions(),
        ]);
        if (cancelled) return;
        setSiteOptions(sites);
        setEmployeeOptions(employees);

        if (mode === "edit" && routeKey) {
          const user = await getUser(routeKey);
          if (cancelled) return;
          setOriginalKey(user.key);
          setKey(user.key);
          setLoginName(user.loginName);
          setFirstName(user.firstName);
          setLastName(user.lastName);
          setEmail(user.email);
          setSecondarySiteKeys(user.secondarySites.map((s) => s.key));
          setEmployeeKey(user.employee?.key ?? "");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof UsersApiError
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
    navigate("/users", { viewTransition: true });
  }, [navigate]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        key: key.trim(),
        loginName: loginName.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        secondarySiteKeys,
        employeeKey: employeeKey.trim().length > 0 ? employeeKey.trim() : null,
      };

      const saved =
        mode === "create"
          ? await createUser({ ...payload, password })
          : await updateUser(originalKey ?? routeKey!, {
              ...payload,
              password: password.trim() || undefined,
            });

      if (currentUser && originalKey && currentUser.key === originalKey) {
        updateStoredUser(saved);
      }

      setPanelTransitionDirection("back");
      navigate("/users", { replace: true, viewTransition: true });
    } catch (err) {
      setError(
        err instanceof UsersApiError
          ? err.message
          : "Speichern ist fehlgeschlagen",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const siteMultiSelectOptions = useMemo(
    () =>
      siteOptions.map((site) => ({
        value: site.key,
        label: `${site.key} — ${site.name}`,
        keywords: [site.key, site.name],
        color: site.colorCode,
      })),
    [siteOptions],
  );

  const employeeComboboxOptions = useMemo(
    () =>
      employeeOptions.map((option) => {
        const assignedElsewhere =
          option.assignedUserKey !== null &&
          option.assignedUserKey !== originalKey;
        const name = `${option.firstName} ${option.lastName}`.trim();
        const label = `${option.key} — ${name}`;
        return {
          value: option.key,
          label: assignedElsewhere ? `${label} (bereits zugeordnet)` : label,
          disabled: assignedElsewhere,
          keywords: [option.key, option.firstName, option.lastName, name],
        };
      }),
    [employeeOptions, originalKey],
  );

  const primaryLabel = currentUser
    ? `${currentUser.primarySite.key} — ${currentUser.primarySite.name}`
    : "—";

  const pageTitle =
    mode === "create" ? "Benutzer anlegen" : "Benutzer bearbeiten";

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
                form="user-form"
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
          id="user-form"
          className="mt-8 flex w-full flex-col gap-8 px-3"
          onSubmit={onSubmit}
        >
          <section aria-labelledby="user-base-heading" className="flex flex-col gap-4">
            <h2
              id="user-base-heading"
              className="flex items-center gap-2 border-b border-outline-variant pb-2 text-sm font-semibold tracking-wide text-on-surface uppercase"
            >
              <IconId size={18} stroke={1.75} className="text-primary" />
              Basis Informationen
            </h2>
            <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              <Field
                id="user-key"
                label="Schlüssel"
                value={key}
                onChange={setKey}
                required
                autoComplete="off"
              />
              <Field
                id="user-login"
                label="Login"
                value={loginName}
                onChange={setLoginName}
                required
                autoComplete="username"
              />
              <Field
                id="user-first-name"
                label="Vorname"
                value={firstName}
                onChange={setFirstName}
                autoComplete="given-name"
              />
              <Field
                id="user-last-name"
                label="Nachname"
                value={lastName}
                onChange={setLastName}
                autoComplete="family-name"
              />
              <Field
                id="user-email"
                label="E-Mail"
                value={email}
                onChange={setEmail}
                required
                autoComplete="email"
                type="email"
              />
              <SearchableField
                texts={[
                  "Passwort",
                  mode === "edit" ? "leer lassen zum Beibehalten" : "",
                ]}
              >
                <FloatingField
                  id="user-password"
                  label="Passwort"
                  value={password}
                  onChange={setPassword}
                  required={mode === "create"}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  hint={
                    mode === "edit"
                      ? "Leer lassen zum Beibehalten"
                      : undefined
                  }
                  endAdornment={
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 z-10 flex items-center pr-3 text-on-surface-variant hover:text-on-surface"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={
                        showPassword
                          ? "Passwort verbergen"
                          : "Passwort anzeigen"
                      }
                    >
                      {showPassword ? (
                        <IconEyeOff size={16} stroke={2} />
                      ) : (
                        <IconEye size={16} stroke={2} />
                      )}
                    </button>
                  }
                />
              </SearchableField>
            </div>
          </section>

          <section
            aria-labelledby="user-sites-heading"
            className="flex flex-col gap-4"
          >
            <h2
              id="user-sites-heading"
              className="flex items-center gap-2 border-b border-outline-variant pb-2 text-sm font-semibold tracking-wide text-on-surface uppercase"
            >
              <IconBuilding size={18} stroke={1.75} className="text-primary" />
              Mandanten
            </h2>
            <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              <div className="flex flex-col gap-5">
                <SearchableField texts={["Hauptmandant", primaryLabel]}>
                  <FloatingField
                    id="user-primary-site"
                    label="Hauptmandant"
                    value={primaryLabel}
                    readOnly
                  />
                </SearchableField>
                <SearchableField
                  texts={[
                    "Nebenmandanten",
                    ...secondarySiteKeys,
                    ...siteOptions.flatMap((site) => [site.key, site.name]),
                  ]}
                >
                  <MultiSelect
                    id="user-secondary-sites"
                    label="Nebenmandanten"
                    values={secondarySiteKeys}
                    onChange={setSecondarySiteKeys}
                    options={siteMultiSelectOptions}
                    emptyText={
                      siteOptions.length === 0
                        ? "Keine weiteren Mandanten verfügbar."
                        : "Keine Treffer"
                    }
                  />
                </SearchableField>
              </div>
            </div>
          </section>

          <section
            aria-labelledby="user-references-heading"
            className="flex flex-col gap-4"
          >
            <h2
              id="user-references-heading"
              className="flex items-center gap-2 border-b border-outline-variant pb-2 text-sm font-semibold tracking-wide text-on-surface uppercase"
            >
              <IconLink size={18} stroke={1.75} className="text-primary" />
              Referenzen
            </h2>
            <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              <SearchableField
                texts={[
                  "Mitarbeiter",
                  employeeKey,
                  ...employeeOptions.flatMap((option) => [
                    option.key,
                    option.firstName,
                    option.lastName,
                  ]),
                ]}
              >
                <Combobox
                  id="user-employee"
                  label="Mitarbeiter"
                  value={employeeKey}
                  onChange={setEmployeeKey}
                  options={employeeComboboxOptions}
                />
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
  type?: "text" | "email";
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
        type={props.type}
      />
    </SearchableField>
  );
}
