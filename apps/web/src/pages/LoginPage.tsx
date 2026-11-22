import {
  IconArrowRight,
  IconBolt,
  IconEye,
  IconEyeOff,
  IconLock,
  IconUser,
} from "@tabler/icons-react";
import { FormEvent, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import loginBgDay from "../assets/login-bg-day.jpg";
import loginBgNight from "../assets/login-bg-night.jpg";
import loginBgSunrise from "../assets/login-bg-sunrise.jpg";
import { ThemeToggle } from "../components/ThemeToggle";
import { getAccessToken, loginRequest, saveSession } from "../lib/auth";

type LoginPeriod = "sunrise" | "day" | "night";

function loginPeriodForHour(hour: number): LoginPeriod {
  if (hour >= 6 && hour < 12) return "sunrise";
  if (hour >= 12 && hour < 18) return "day";
  return "night";
}

const LOGIN_PERIODS: LoginPeriod[] = ["sunrise", "day", "night"];

const LOGIN_BACKGROUNDS: Record<LoginPeriod, { src: string; scrim: string }> = {
  sunrise: { src: loginBgSunrise, scrim: "bg-black/25" },
  day: { src: loginBgDay, scrim: "bg-black/20" },
  night: { src: loginBgNight, scrim: "bg-black/55" },
};

const BACKGROUND_ROTATE_MS = 30_000;

function useLoginBackgroundIndex() {
  const [index, setIndex] = useState(() => {
    const period = loginPeriodForHour(new Date().getHours());
    const start = LOGIN_PERIODS.indexOf(period);
    return start === -1 ? 0 : start;
  });

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % LOGIN_PERIODS.length);
    }, BACKGROUND_ROTATE_MS);
    return () => window.clearInterval(id);
  }, []);

  return index;
}

export function LoginPage() {
  const navigate = useNavigate();
  const [loginName, setLoginName] = useState("m.weber");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const backgroundIndex = useLoginBackgroundIndex();

  if (getAccessToken()) {
    return <Navigate to="/sites" replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await loginRequest({
        loginName,
        password,
        rememberMe,
      });
      saveSession(result, rememberMe);
      navigate("/sites", { replace: true });
    } catch {
      setError("Anmeldung fehlgeschlagen. Bitte Zugangsdaten prüfen.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden bg-black p-4 sm:p-6 select-none">
      <ThemeToggle
        outlined
        className="absolute top-4 right-4 z-30"
      />

      <div className="absolute inset-0 z-0">
        {LOGIN_PERIODS.map((period, index) => (
          <div
            key={period}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out motion-reduce:transition-none ${
              index === backgroundIndex ? "opacity-100" : "opacity-0"
            }`}
          >
            <img
              src={LOGIN_BACKGROUNDS[period].src}
              alt=""
              className="h-full w-full object-cover object-center"
            />
            <div className={`absolute inset-0 ${LOGIN_BACKGROUNDS[period].scrim}`} />
          </div>
        ))}
      </div>

      <main
        className="relative z-20 flex min-h-[560px] w-full max-w-[460px] flex-col rounded border border-white/80 bg-white/90 p-8 sm:min-h-[640px] sm:p-10 md:absolute md:top-1/2 md:left-[clamp(1.5rem,calc(70%-230px),calc(100%-460px-1.5rem))] md:w-[460px] md:-translate-y-1/2 dark:border-white/15 dark:bg-surface-container-lowest/85"
        style={{
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
        }}
      >
        <div className="mb-10 text-center">
          <div className="mb-2 inline-flex items-center justify-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-primary text-on-primary">
              <IconBolt size={22} stroke={2.2} />
            </div>
            <span className="text-2xl font-semibold text-on-surface">PULSE</span>
          </div>
          <h1 className="text-xl font-semibold text-on-surface">
            Willkommen zurück
          </h1>
        </div>

        <form className="flex flex-1 flex-col gap-5" onSubmit={onSubmit}>
          <div>
            <label
              htmlFor="username"
              className="mb-1.5 block text-xs font-medium leading-4 text-on-surface-variant"
            >
              E-Mail oder Mitarbeiter-ID
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-on-surface-variant">
                <IconUser size={16} stroke={2} />
              </div>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                placeholder="z. B. m.weber@pul.se oder ID-8492"
                className="block w-full rounded border border-outline-variant bg-surface-container-lowest py-2.5 pr-3.5 pl-10 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-xs font-medium leading-4 text-on-surface-variant"
              >
                Passwort
              </label>
              <span
                className="cursor-not-allowed text-xs font-medium text-primary/60"
                title="Noch nicht verfügbar"
              >
                Passwort vergessen?
              </span>
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-on-surface-variant">
                <IconLock size={16} stroke={2} />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded border border-outline-variant bg-surface-container-lowest py-2.5 pr-10 pl-10 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-on-surface-variant hover:text-on-surface"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
              >
                {showPassword ? (
                  <IconEyeOff size={16} stroke={2} />
                ) : (
                  <IconEye size={16} stroke={2} />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center pt-1">
            <input
              id="remember"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 cursor-pointer rounded border-outline-variant text-primary accent-primary focus:ring-primary"
            />
            <label
              htmlFor="remember"
              className="ml-2.5 block cursor-pointer text-xs text-on-surface-variant"
            >
              Angemeldet bleiben auf diesem Terminal
            </label>
          </div>

          {error ? (
            <p className="text-sm text-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-auto pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded bg-primary px-4 py-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-container focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:outline-none disabled:opacity-70"
            >
              <span>{submitting ? "Anmelden…" : "Im CMMS anmelden"}</span>
              <IconArrowRight size={16} stroke={2} />
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
