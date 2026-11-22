import { getAccessToken } from "./auth";

export type ManagedCostCenter = {
  key: string;
  name: string;
};

export type CostCenterWriteInput = {
  key: string;
  name: string;
};

export class CostCentersApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "CostCentersApiError";
  }
}

async function authFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const token = getAccessToken();
  if (!token) {
    throw new CostCentersApiError("Nicht angemeldet", 401);
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

async function readError(response: Response): Promise<CostCentersApiError> {
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
  return new CostCentersApiError(message, response.status);
}

export async function listCostCenters(): Promise<ManagedCostCenter[]> {
  const response = await authFetch("/api/cost-centers");
  if (!response.ok) {
    throw await readError(response);
  }
  return (await response.json()) as ManagedCostCenter[];
}

export async function getCostCenter(key: string): Promise<ManagedCostCenter> {
  const response = await authFetch(
    `/api/cost-centers/${encodeURIComponent(key)}`,
  );
  if (!response.ok) {
    throw await readError(response);
  }
  return (await response.json()) as ManagedCostCenter;
}

export async function createCostCenter(
  input: CostCenterWriteInput,
): Promise<ManagedCostCenter> {
  const response = await authFetch("/api/cost-centers", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw await readError(response);
  }
  return (await response.json()) as ManagedCostCenter;
}

export async function updateCostCenter(
  currentKey: string,
  input: CostCenterWriteInput,
): Promise<ManagedCostCenter> {
  const response = await authFetch(
    `/api/cost-centers/${encodeURIComponent(currentKey)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  if (!response.ok) {
    throw await readError(response);
  }
  return (await response.json()) as ManagedCostCenter;
}

export async function deleteCostCenter(key: string): Promise<void> {
  const response = await authFetch(
    `/api/cost-centers/${encodeURIComponent(key)}`,
    {
      method: "DELETE",
    },
  );
  if (!response.ok) {
    throw await readError(response);
  }
}
