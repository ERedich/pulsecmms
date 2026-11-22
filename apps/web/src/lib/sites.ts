import { getAccessToken } from "./auth";

export type ManagedSite = {
  key: string;
  name: string;
  colorCode: string;
};

export type SiteWriteInput = {
  key: string;
  name: string;
  colorCode: string;
};

export class SitesApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "SitesApiError";
  }
}

async function authFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const token = getAccessToken();
  if (!token) {
    throw new SitesApiError("Nicht angemeldet", 401);
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

async function readError(response: Response): Promise<SitesApiError> {
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
  return new SitesApiError(message, response.status);
}

export async function listSites(): Promise<ManagedSite[]> {
  const response = await authFetch("/api/sites");
  if (!response.ok) {
    throw await readError(response);
  }
  return (await response.json()) as ManagedSite[];
}

export async function getSite(key: string): Promise<ManagedSite> {
  const response = await authFetch(`/api/sites/${encodeURIComponent(key)}`);
  if (!response.ok) {
    throw await readError(response);
  }
  return (await response.json()) as ManagedSite;
}

export async function createSite(
  input: SiteWriteInput,
): Promise<ManagedSite> {
  const response = await authFetch("/api/sites", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw await readError(response);
  }
  return (await response.json()) as ManagedSite;
}

export async function updateSite(
  currentKey: string,
  input: SiteWriteInput,
): Promise<ManagedSite> {
  const response = await authFetch(
    `/api/sites/${encodeURIComponent(currentKey)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  if (!response.ok) {
    throw await readError(response);
  }
  return (await response.json()) as ManagedSite;
}

export async function deleteSite(key: string): Promise<void> {
  const response = await authFetch(`/api/sites/${encodeURIComponent(key)}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw await readError(response);
  }
}
