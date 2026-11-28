import { getAccessToken } from "./auth";

export type SettingCategory = "general" | "lists" | "orders";
export type SettingScope = "global" | "site";
export type SettingValueType = "number";

export type ManagedSetting = {
  uid: string | null;
  key: string;
  name: string;
  description: string;
  explanation: string;
  category: SettingCategory;
  scope: SettingScope;
  valueType: SettingValueType;
  value: number;
};

export class SettingsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "SettingsApiError";
  }
}

async function authFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const token = getAccessToken();
  if (!token) {
    throw new SettingsApiError("Nicht angemeldet", 401);
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

async function readError(response: Response): Promise<SettingsApiError> {
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
  return new SettingsApiError(message, response.status);
}

export async function listSettings(): Promise<ManagedSetting[]> {
  const response = await authFetch("/api/settings");
  if (!response.ok) {
    throw await readError(response);
  }
  return (await response.json()) as ManagedSetting[];
}

export async function getSetting(key: string): Promise<ManagedSetting> {
  const response = await authFetch(
    `/api/settings/${encodeURIComponent(key)}`,
  );
  if (!response.ok) {
    throw await readError(response);
  }
  return (await response.json()) as ManagedSetting;
}

export async function updateSetting(
  key: string,
  value: number,
): Promise<ManagedSetting> {
  const response = await authFetch(
    `/api/settings/${encodeURIComponent(key)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ value }),
    },
  );
  if (!response.ok) {
    throw await readError(response);
  }
  return (await response.json()) as ManagedSetting;
}

export function formatSettingValue(setting: ManagedSetting): string {
  if (setting.valueType === "number") {
    return setting.value.toLocaleString("de", {
      maximumFractionDigits: 4,
    });
  }
  return String(setting.value);
}
