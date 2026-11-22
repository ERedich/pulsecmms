import {
  IconBorderCorners,
  IconBuilding,
  IconComponents,
  IconMapPin,
  IconTool,
} from "@tabler/icons-react";
import type { ElementType } from "react";
import { getAccessToken } from "./auth";

export const ASSET_TYPES = [
  "location",
  "building",
  "area",
  "assembly",
  "maintenance_object",
] as const;

export type AssetType = (typeof ASSET_TYPES)[number];

export type AssetTypeMeta = {
  label: string;
  color: string;
  icon: ElementType;
};

/** Pastel color and icon per type — UI only, not stored in DB. */
export const ASSET_TYPE_META: Record<AssetType, AssetTypeMeta> = {
  location: {
    label: "Standort",
    color: "#BFDBFE",
    icon: IconMapPin,
  },
  building: {
    label: "Gebäude",
    color: "#A5F3FC",
    icon: IconBuilding,
  },
  area: {
    label: "Fläche",
    color: "#BBF7D0",
    icon: IconBorderCorners,
  },
  assembly: {
    label: "Baugruppe",
    color: "#FED7AA",
    icon: IconComponents,
  },
  maintenance_object: {
    label: "Instandhaltungsobjekt",
    color: "#FBCFE8",
    icon: IconTool,
  },
};

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  location: ASSET_TYPE_META.location.label,
  building: ASSET_TYPE_META.building.label,
  area: ASSET_TYPE_META.area.label,
  assembly: ASSET_TYPE_META.assembly.label,
  maintenance_object: ASSET_TYPE_META.maintenance_object.label,
};

/** Lower rank = higher in hierarchy (Standort is top). */
export const ASSET_TYPE_RANK: Record<AssetType, number> = {
  location: 0,
  building: 1,
  area: 2,
  assembly: 3,
  maintenance_object: 4,
};

/** Parent may host child if child is same level or lower in the hierarchy. */
export function canHostAssetType(
  parentType: AssetType,
  childType: AssetType,
): boolean {
  return ASSET_TYPE_RANK[childType] >= ASSET_TYPE_RANK[parentType];
}

export function parentIsRequired(type: AssetType): boolean {
  return type !== "location";
}

export type ManagedAsset = {
  key: string;
  type: AssetType;
  parentKey: string | null;
  costCenterKey: string;
  serialNumber: string | null;
  manufacturer: string | null;
  thumbnailUrl: string | null;
};

export type AssetWriteInput = {
  key: string;
  type: AssetType;
  parentKey: string | null;
  costCenterKey: string;
  serialNumber: string;
  manufacturer: string;
};

export class AssetsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AssetsApiError";
  }
}

async function authFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const token = getAccessToken();
  if (!token) {
    throw new AssetsApiError("Nicht angemeldet", 401);
  }

  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;

  return fetch(path, {
    ...init,
    headers: {
      ...(init?.body && !isFormData
        ? { "Content-Type": "application/json" }
        : {}),
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

async function readError(response: Response): Promise<AssetsApiError> {
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
  return new AssetsApiError(message, response.status);
}

export async function listAssets(): Promise<ManagedAsset[]> {
  const response = await authFetch("/api/assets");
  if (!response.ok) {
    throw await readError(response);
  }
  return (await response.json()) as ManagedAsset[];
}

export async function getAsset(key: string): Promise<ManagedAsset> {
  const response = await authFetch(`/api/assets/${encodeURIComponent(key)}`);
  if (!response.ok) {
    throw await readError(response);
  }
  return (await response.json()) as ManagedAsset;
}

export async function createAsset(
  input: AssetWriteInput,
): Promise<ManagedAsset> {
  const response = await authFetch("/api/assets", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw await readError(response);
  }
  return (await response.json()) as ManagedAsset;
}

export async function updateAsset(
  currentKey: string,
  input: AssetWriteInput,
): Promise<ManagedAsset> {
  const response = await authFetch(
    `/api/assets/${encodeURIComponent(currentKey)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  if (!response.ok) {
    throw await readError(response);
  }
  return (await response.json()) as ManagedAsset;
}

export async function deleteAsset(key: string): Promise<void> {
  const response = await authFetch(
    `/api/assets/${encodeURIComponent(key)}`,
    {
      method: "DELETE",
    },
  );
  if (!response.ok) {
    throw await readError(response);
  }
}

export async function uploadAssetThumbnail(
  key: string,
  file: File,
): Promise<ManagedAsset> {
  const body = new FormData();
  body.append("file", file);
  const response = await authFetch(
    `/api/assets/${encodeURIComponent(key)}/thumbnail`,
    {
      method: "POST",
      body,
    },
  );
  if (!response.ok) {
    throw await readError(response);
  }
  return (await response.json()) as ManagedAsset;
}

export async function deleteAssetThumbnail(
  key: string,
): Promise<ManagedAsset> {
  const response = await authFetch(
    `/api/assets/${encodeURIComponent(key)}/thumbnail`,
    {
      method: "DELETE",
    },
  );
  if (!response.ok) {
    throw await readError(response);
  }
  return (await response.json()) as ManagedAsset;
}

export function assetTypeLabel(type: AssetType): string {
  return ASSET_TYPE_META[type].label;
}

export function assetTypeMeta(type: AssetType): AssetTypeMeta {
  return ASSET_TYPE_META[type];
}
