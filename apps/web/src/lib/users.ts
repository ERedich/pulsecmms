import type { AuthUser, EmployeeRef, SiteRef } from "./auth";
import { getAccessToken } from "./auth";

export type ManagedUser = AuthUser & { uid: string };

export type EmployeeOption = EmployeeRef & {
  assignedUserKey: string | null;
};

export type UserWriteInput = {
  key: string;
  loginName: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  secondarySiteKeys: string[];
  employeeKey: string | null;
};

export class UsersApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "UsersApiError";
  }
}

async function authFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const token = getAccessToken();
  if (!token) {
    throw new UsersApiError("Nicht angemeldet", 401);
  }

  return fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

async function readError(response: Response): Promise<UsersApiError> {
  let message = "Anfrage fehlgeschlagen";
  try {
    const body = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) {
      message = body.message.join(", ");
    } else if (typeof body.message === "string" && body.message.length > 0) {
      message = body.message;
    }
  } catch {
    // keep default message
  }
  return new UsersApiError(message, response.status);
}

export async function listUsers(): Promise<ManagedUser[]> {
  const response = await authFetch("/api/users");
  if (!response.ok) {
    throw await readError(response);
  }
  return (await response.json()) as ManagedUser[];
}

export async function getUser(key: string): Promise<ManagedUser> {
  const response = await authFetch(`/api/users/${encodeURIComponent(key)}`);
  if (!response.ok) {
    throw await readError(response);
  }
  return (await response.json()) as ManagedUser;
}

export async function listSiteOptions(): Promise<SiteRef[]> {
  const response = await authFetch("/api/users/site-options");
  if (!response.ok) {
    throw await readError(response);
  }
  return (await response.json()) as SiteRef[];
}

export async function listEmployeeOptions(): Promise<EmployeeOption[]> {
  const response = await authFetch("/api/users/employee-options");
  if (!response.ok) {
    throw await readError(response);
  }
  return (await response.json()) as EmployeeOption[];
}

export async function createUser(
  input: UserWriteInput & { password: string },
): Promise<ManagedUser> {
  const response = await authFetch("/api/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw await readError(response);
  }
  return (await response.json()) as ManagedUser;
}

export async function updateUser(
  currentKey: string,
  input: UserWriteInput,
): Promise<ManagedUser> {
  const body: Record<string, unknown> = {
    key: input.key,
    loginName: input.loginName,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    secondarySiteKeys: input.secondarySiteKeys,
    employeeKey: input.employeeKey,
  };
  if (input.password && input.password.length > 0) {
    body.password = input.password;
  }

  const response = await authFetch(
    `/api/users/${encodeURIComponent(currentKey)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
  if (!response.ok) {
    throw await readError(response);
  }
  return (await response.json()) as ManagedUser;
}

export async function deleteUser(key: string): Promise<void> {
  const response = await authFetch(`/api/users/${encodeURIComponent(key)}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw await readError(response);
  }
}
