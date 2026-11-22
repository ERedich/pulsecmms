export type SiteRef = {
  key: string;
  name: string;
  colorCode: string;
};

export type EmployeeRef = {
  key: string;
  firstName: string;
  lastName: string;
};

export type AuthUser = {
  key: string;
  loginName: string;
  firstName: string;
  lastName: string;
  email: string;
  primarySite: SiteRef;
  secondarySites: SiteRef[];
  employee: EmployeeRef | null;
};

export type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};

const TOKEN_KEY = "pulse_access_token";
const USER_KEY = "pulse_auth_user";

function storage(rememberMe: boolean): Storage {
  return rememberMe ? localStorage : sessionStorage;
}

export function saveSession(
  response: LoginResponse,
  rememberMe: boolean,
): void {
  clearSession();
  const store = storage(rememberMe);
  store.setItem(TOKEN_KEY, response.accessToken);
  store.setItem(USER_KEY, JSON.stringify(response.user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function getAccessToken(): string | null {
  return (
    sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY)
  );
}

export function getStoredUser(): AuthUser | null {
  const raw =
    sessionStorage.getItem(USER_KEY) ?? localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export const AUTH_USER_UPDATED_EVENT = "pulse:auth-user-updated";

export function updateStoredUser(user: AuthUser): void {
  if (sessionStorage.getItem(USER_KEY) !== null) {
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  if (localStorage.getItem(USER_KEY) !== null) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  window.dispatchEvent(new Event(AUTH_USER_UPDATED_EVENT));
}

/** Sync session site labels after a Mandant key/name change. */
export function syncStoredUserSites(site: SiteRef, previousKey: string): void {
  const user = getStoredUser();
  if (!user) return;

  let changed = false;
  let next = user;

  if (user.primarySite.key === previousKey) {
    next = { ...next, primarySite: site };
    changed = true;
  }

  const secondarySites = user.secondarySites.map((entry) => {
    if (entry.key !== previousKey) return entry;
    changed = true;
    return site;
  });

  if (changed) {
    updateStoredUser({ ...next, secondarySites });
  }
}

export async function loginRequest(input: {
  loginName: string;
  password: string;
  rememberMe: boolean;
}): Promise<LoginResponse> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      loginName: input.loginName,
      password: input.password,
      rememberMe: input.rememberMe,
    }),
  });

  if (!response.ok) {
    throw new Error("Ungültige Anmeldedaten");
  }

  return (await response.json()) as LoginResponse;
}
