export const ASSET_TYPES = [
  "location",
  "building",
  "area",
  "assembly",
  "maintenance_object",
] as const;

export type AssetType = (typeof ASSET_TYPES)[number];

/** Lower rank = higher in hierarchy (Standort is top). */
export const ASSET_TYPE_RANK: Record<AssetType, number> = {
  location: 0,
  building: 1,
  area: 2,
  assembly: 3,
  maintenance_object: 4,
};

export function isAssetType(value: string): value is AssetType {
  return (ASSET_TYPES as readonly string[]).includes(value);
}

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
