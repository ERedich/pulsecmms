export type SettingCategory = "general" | "lists" | "orders";
export type SettingScope = "global" | "site";
export type SettingValueType = "number";

export type SettingCatalogEntry = {
  key: string;
  name: string;
  description: string;
  explanation: string;
  category: SettingCategory;
  scope: SettingScope;
  valueType: SettingValueType;
  defaultValue: number;
};

export const SETTING_CATALOG: readonly SettingCatalogEntry[] = [
  {
    key: "DWH",
    name: "Standard Arbeitszeit",
    description:
      "Gibt an, wie viel Arbeitszeit für einen Plan-Tag von Pulse verwendet werden soll.",
    explanation:
      "Gibt an, wie viel Arbeitszeit für einen Plan-Tag von Pulse verwendet werden soll.",
    category: "general",
    scope: "site",
    valueType: "number",
    defaultValue: 8,
  },
] as const;

export function findCatalogEntry(
  key: string,
): SettingCatalogEntry | undefined {
  return SETTING_CATALOG.find((entry) => entry.key === key);
}
