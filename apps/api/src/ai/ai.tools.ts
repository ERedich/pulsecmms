import { tool, type ToolSet } from "ai";
import { z } from "zod";
import type { AssetPublic } from "../assets/assets.service";
import type { AssetsService } from "../assets/assets.service";
import type { CostCentersService } from "../cost-centers/cost-centers.service";
import type { DocumentsService } from "../documents/documents.service";
import type { EmployeesService } from "../employees/employees.service";
import type { SitesService } from "../sites/sites.service";
import type { UsersService } from "../users/users.service";
import type { DocumentTextService } from "./document-text.service";

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 100;

export type AiToolDeps = {
  siteUid: string;
  sites: SitesService;
  costCenters: CostCentersService;
  employees: EmployeesService;
  users: UsersService;
  assets: AssetsService;
  documents: DocumentsService;
  documentText: DocumentTextService;
};

function clampLimit(limit: number | undefined): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) {
    return DEFAULT_LIMIT;
  }
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit)));
}

function withoutUid<T extends { uid?: string }>(
  item: T,
): Omit<T, "uid"> {
  const { uid: _uid, ...rest } = item;
  return rest;
}

export function createAiTools(deps: AiToolDeps): ToolSet {
  return {
    listSites: tool({
      description:
        "Listet alle Mandanten (sites) mit key, name und colorCode.",
      inputSchema: z.object({
        limit: z
          .number()
          .int()
          .min(1)
          .max(MAX_LIMIT)
          .optional()
          .describe("Maximale Anzahl zurückgegebener Einträge"),
      }),
      execute: async ({ limit }) => {
        const capped = clampLimit(limit);
        const all = await deps.sites.list();
        const items = all.slice(0, capped).map((site) => withoutUid(site));
        return { total: all.length, items, truncated: all.length > capped };
      },
    }),

    listCostCenters: tool({
      description:
        "Listet Kostenstellen des aktiven Mandanten (key, name).",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(MAX_LIMIT).optional(),
        query: z
          .string()
          .optional()
          .describe("Optionaler Filter auf key oder name"),
      }),
      execute: async ({ limit, query }) => {
        const capped = clampLimit(limit);
        const needle = query?.trim().toLowerCase() ?? "";
        const all = await deps.costCenters.listForSite(deps.siteUid);
        const filtered =
          needle.length === 0
            ? all
            : all.filter(
                (item) =>
                  item.key.toLowerCase().includes(needle) ||
                  item.name.toLowerCase().includes(needle),
              );
        return {
          total: filtered.length,
          items: filtered.slice(0, capped).map((item) => withoutUid(item)),
          truncated: filtered.length > capped,
        };
      },
    }),

    listEmployees: tool({
      description:
        "Listet Mitarbeiter des aktiven Mandanten (key, firstName, lastName).",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(MAX_LIMIT).optional(),
        query: z
          .string()
          .optional()
          .describe("Optionaler Filter auf key oder Namen"),
      }),
      execute: async ({ limit, query }) => {
        const capped = clampLimit(limit);
        const needle = query?.trim().toLowerCase() ?? "";
        const all = await deps.employees.listForSite(deps.siteUid);
        const filtered =
          needle.length === 0
            ? all
            : all.filter((item) => {
                const haystack =
                  `${item.key} ${item.firstName} ${item.lastName}`.toLowerCase();
                return haystack.includes(needle);
              });
        return {
          total: filtered.length,
          items: filtered.slice(0, capped).map((item) => withoutUid(item)),
          truncated: filtered.length > capped,
        };
      },
    }),

    listUsers: tool({
      description:
        "Listet Benutzer des aktiven Mandanten ohne Passwort-Hashes (login, Namen, Mandanten, Mitarbeiter).",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(MAX_LIMIT).optional(),
        query: z
          .string()
          .optional()
          .describe("Optionaler Filter auf key, login oder Namen"),
      }),
      execute: async ({ limit, query }) => {
        const capped = clampLimit(limit);
        const needle = query?.trim().toLowerCase() ?? "";
        const all = await deps.users.listForSite(deps.siteUid);
        const mapped = all.map((user) => {
          const { uid: _uid, ...rest } = user;
          return rest;
        });
        const filtered =
          needle.length === 0
            ? mapped
            : mapped.filter((item) => {
                const haystack =
                  `${item.key} ${item.loginName} ${item.firstName} ${item.lastName} ${item.email}`.toLowerCase();
                return haystack.includes(needle);
              });
        return {
          total: filtered.length,
          items: filtered.slice(0, capped),
          truncated: filtered.length > capped,
        };
      },
    }),

    searchAssets: tool({
      description:
        "Sucht Assets des aktiven Mandanten nach Text, Typ, Kostenstelle oder Eltern-Key.",
      inputSchema: z.object({
        query: z
          .string()
          .optional()
          .describe("Freitext über key, Hersteller, Seriennummer"),
        type: z
          .enum([
            "location",
            "building",
            "area",
            "assembly",
            "maintenance_object",
          ])
          .optional(),
        costCenterKey: z.string().optional(),
        parentKey: z.string().optional(),
        limit: z.number().int().min(1).max(MAX_LIMIT).optional(),
      }),
      execute: async ({ query, type, costCenterKey, parentKey, limit }) => {
        const capped = clampLimit(limit);
        const needle = query?.trim().toLowerCase() ?? "";
        const all = await deps.assets.listForSite(deps.siteUid);
        const filtered = all.filter((asset) => {
          if (type && asset.type !== type) return false;
          if (costCenterKey && asset.costCenterKey !== costCenterKey) {
            return false;
          }
          if (parentKey && asset.parentKey !== parentKey) return false;
          if (!needle) return true;
          const haystack =
            `${asset.key} ${asset.manufacturer ?? ""} ${asset.serialNumber ?? ""} ${asset.costCenterKey} ${asset.parentKey ?? ""}`.toLowerCase();
          return haystack.includes(needle);
        });
        return {
          total: filtered.length,
          items: filtered.slice(0, capped).map((item) => summarizeAsset(item)),
          truncated: filtered.length > capped,
        };
      },
    }),

    getAsset: tool({
      description:
        "Lädt ein Asset inkl. direkter Kinder und Dokumentanzahl.",
      inputSchema: z.object({
        key: z.string().describe("Asset-Key"),
      }),
      execute: async ({ key }) => {
        const asset = await deps.assets.getForSite(deps.siteUid, key.trim());
        const all = await deps.assets.listForSite(deps.siteUid);
        const children = all
          .filter((item) => item.parentKey === asset.key)
          .map((item) => summarizeAsset(item));
        const counts = await deps.documents.countsForSite(
          deps.siteUid,
          "assets",
        );
        return {
          asset: summarizeAsset(asset),
          children,
          documentCount: counts[asset.key] ?? 0,
        };
      },
    }),

    searchDocuments: tool({
      description:
        "Durchsucht Asset-Dokumente nach Dateiname und extrahiertem Textinhalt. Ohne query werden alle Dokumente (Metadaten) gelistet.",
      inputSchema: z.object({
        query: z
          .string()
          .optional()
          .describe("Suchbegriff; leer oder weglassen listet alle Dokumente"),
        limit: z.number().int().min(1).max(MAX_LIMIT).optional(),
      }),
      execute: async ({ query, limit }) => {
        return deps.documentText.search(
          deps.siteUid,
          query ?? "",
          clampLimit(limit),
        );
      },
    }),

    readDocument: tool({
      description:
        "Liest den extrahierten Text eines Dokuments (gekürzt bei sehr langen Dateien).",
      inputSchema: z.object({
        recordKey: z.string().describe("Asset-Key des Datensatzes"),
        filename: z.string().describe("Dateiname des Dokuments"),
      }),
      execute: async ({ recordKey, filename }) => {
        return deps.documentText.read(
          deps.siteUid,
          recordKey.trim(),
          filename.trim(),
        );
      },
    }),
  };
}

function summarizeAsset(asset: AssetPublic) {
  return {
    key: asset.key,
    type: asset.type,
    parentKey: asset.parentKey,
    costCenterKey: asset.costCenterKey,
    serialNumber: asset.serialNumber,
    manufacturer: asset.manufacturer,
    hasThumbnail: Boolean(asset.thumbnailUrl),
  };
}
