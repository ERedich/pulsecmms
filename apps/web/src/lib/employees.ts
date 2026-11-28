import { getAccessToken } from "./auth";

export type ManagedEmployee = {
  uid: string;
  key: string;
  firstName: string;
  lastName: string;
};

export type EmployeeWriteInput = {
  key: string;
  firstName: string;
  lastName: string;
};

export class EmployeesApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "EmployeesApiError";
  }
}

async function authFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const token = getAccessToken();
  if (!token) {
    throw new EmployeesApiError("Nicht angemeldet", 401);
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

async function readError(response: Response): Promise<EmployeesApiError> {
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
  return new EmployeesApiError(message, response.status);
}

export async function listEmployees(): Promise<ManagedEmployee[]> {
  const response = await authFetch("/api/employees");
  if (!response.ok) {
    throw await readError(response);
  }
  return (await response.json()) as ManagedEmployee[];
}

export async function getEmployee(key: string): Promise<ManagedEmployee> {
  const response = await authFetch(
    `/api/employees/${encodeURIComponent(key)}`,
  );
  if (!response.ok) {
    throw await readError(response);
  }
  return (await response.json()) as ManagedEmployee;
}

export async function createEmployee(
  input: EmployeeWriteInput,
): Promise<ManagedEmployee> {
  const response = await authFetch("/api/employees", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw await readError(response);
  }
  return (await response.json()) as ManagedEmployee;
}

export async function updateEmployee(
  currentKey: string,
  input: EmployeeWriteInput,
): Promise<ManagedEmployee> {
  const response = await authFetch(
    `/api/employees/${encodeURIComponent(currentKey)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  if (!response.ok) {
    throw await readError(response);
  }
  return (await response.json()) as ManagedEmployee;
}

export async function deleteEmployee(key: string): Promise<void> {
  const response = await authFetch(
    `/api/employees/${encodeURIComponent(key)}`,
    {
      method: "DELETE",
    },
  );
  if (!response.ok) {
    throw await readError(response);
  }
}
