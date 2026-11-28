import {
  IconBuilding,
  IconEye,
  IconEyeOff,
  IconId,
  IconLink,
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
import { FormSection } from "../components/FormSection";
import { MiscFormSection } from "../components/MiscFormSection";
import { MultiSelect } from "../components/MultiSelect";
import { SaveButtonGroup } from "../components/SaveButtonGroup";
import { AppTitle } from "../components/layout/AppTitle";
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

const FORM_ID = "user-form";

export function UserFormPage() {
  const navigate = useNavigate();
  useRegisterGlobalSearch("ep");
  const { key: routeKey } = useParams<{ key: string }>();
  const mode: Mode = routeKey ? "edit" : "create";
  const currentUser = getStoredUser();
  const closeAfterSaveRef = useRef(false);

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
          setUid(user.uid);
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
        loginName: loginName.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        secondarySiteKeys,
        employeeKey: employeeKey.trim().length > 0 ? employeeKey.trim() : null,
      };

      const previousKey = originalKey ?? routeKey ?? payload.key;
      const saved =
        mode === "create"
          ? await createUser({ ...payload, password })
          : await updateUser(previousKey, {
              ...payload,
              password: password.trim() || undefined,
            });

      if (
        currentUser &&
        (currentUser.key === previousKey || currentUser.key === saved.key)
      ) {
        const { uid: _uid, ...authUser } = saved;
        updateStoredUser(authUser);
      }

      if (shouldClose) {
        setPanelTransitionDirection("back");
        navigate("/users", { replace: true, viewTransition: true });
        return;
      }

      setOriginalKey(saved.key);
      setUid(saved.uid);
      setKey(saved.key);
      setLoginName(saved.loginName);
      setFirstName(saved.firstName);
      setLastName(saved.lastName);
      setEmail(saved.email);
      setSecondarySiteKeys(saved.secondarySites.map((site) => site.key));
      setEmployeeKey(saved.employee?.key ?? "");
      setPassword("");

      if (mode === "create" || previousKey !== saved.key) {
        navigate(`/users/${encodeURIComponent(saved.key)}/edit`, {
          replace: true,
        });
      }
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

  const pageTitle =
    mode === "create" ? "Benutzer anlegen" : "Benutzer bearbeiten";

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
            headingId="user-base-heading"
            title="Basis Informationen"
            icon={IconId}
          >
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
          </FormSection>

          <FormSection
            headingId="user-sites-heading"
            title="Mandanten"
            icon={IconBuilding}
          >
            <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
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
          </FormSection>

          <FormSection
            headingId="user-references-heading"
            title="Referenzen"
            icon={IconLink}
          >
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
          </FormSection>

          <MiscFormSection
            headingId="user-misc-heading"
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
