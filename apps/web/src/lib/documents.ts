import {
  IconFile,
  IconFileTypeBmp,
  IconFileTypeCsv,
  IconFileTypeDoc,
  IconFileTypeDocx,
  IconFileTypeJpg,
  IconFileTypePdf,
  IconFileTypePng,
  IconFileTypePpt,
  IconFileTypeSvg,
  IconFileTypeTxt,
  IconFileTypeXls,
  IconFileTypeZip,
  IconPhoto,
  type Icon,
} from "@tabler/icons-react";
import { getAccessToken } from "./auth";

export const DOCUMENT_APPS = ["assets"] as const;

export type DocumentApp = (typeof DOCUMENT_APPS)[number];

export function isDocumentApp(value: string): value is DocumentApp {
  return (DOCUMENT_APPS as readonly string[]).includes(value);
}

export type ManagedDocument = {
  name: string;
  size: number;
  modifiedAt: string;
  app: DocumentApp;
  recordKey: string;
};

export type DocumentTypeMeta = {
  icon: Icon;
  color: string;
  label: string;
};

const IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "bmp",
  "svg",
]);

const DOCUMENT_TYPE_META: Record<string, DocumentTypeMeta> = {
  pdf: { icon: IconFileTypePdf, color: "#E5252A", label: "PDF" },
  doc: { icon: IconFileTypeDoc, color: "#2B579A", label: "DOC" },
  docx: { icon: IconFileTypeDocx, color: "#2B579A", label: "DOCX" },
  xls: { icon: IconFileTypeXls, color: "#217346", label: "XLS" },
  xlsx: { icon: IconFileTypeXls, color: "#217346", label: "XLSX" },
  ppt: { icon: IconFileTypePpt, color: "#D24726", label: "PPT" },
  pptx: { icon: IconFileTypePpt, color: "#D24726", label: "PPTX" },
  zip: { icon: IconFileTypeZip, color: "#C9A227", label: "ZIP" },
  rar: { icon: IconFileTypeZip, color: "#C9A227", label: "RAR" },
  "7z": { icon: IconFileTypeZip, color: "#C9A227", label: "7Z" },
  txt: { icon: IconFileTypeTxt, color: "#64748B", label: "TXT" },
  csv: { icon: IconFileTypeCsv, color: "#64748B", label: "CSV" },
  md: { icon: IconFileTypeTxt, color: "#64748B", label: "MD" },
  jpg: { icon: IconFileTypeJpg, color: "#0EA5E9", label: "JPG" },
  jpeg: { icon: IconFileTypeJpg, color: "#0EA5E9", label: "JPEG" },
  png: { icon: IconFileTypePng, color: "#0EA5E9", label: "PNG" },
  webp: { icon: IconPhoto, color: "#0EA5E9", label: "WEBP" },
  gif: { icon: IconPhoto, color: "#0EA5E9", label: "GIF" },
  bmp: { icon: IconFileTypeBmp, color: "#0EA5E9", label: "BMP" },
  svg: { icon: IconFileTypeSvg, color: "#0EA5E9", label: "SVG" },
};

export class DocumentsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "DocumentsApiError";
  }
}

export function documentRowId(doc: ManagedDocument): string {
  return `${doc.app}:${doc.recordKey}:${doc.name}`;
}

export function parseDocumentRowId(
  id: string,
): { app: DocumentApp; recordKey: string; name: string } | null {
  const first = id.indexOf(":");
  const second = id.indexOf(":", first + 1);
  if (first < 0 || second < 0) return null;
  const app = id.slice(0, first);
  if (!isDocumentApp(app)) return null;
  return {
    app,
    recordKey: id.slice(first + 1, second),
    name: id.slice(second + 1),
  };
}

async function authFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const token = getAccessToken();
  if (!token) {
    throw new DocumentsApiError("Nicht angemeldet", 401);
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

async function readError(response: Response): Promise<DocumentsApiError> {
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
  return new DocumentsApiError(message, response.status);
}

export async function listDocuments(options?: {
  app?: DocumentApp;
  recordKey?: string;
}): Promise<ManagedDocument[]> {
  const app = options?.app ?? "assets";
  const params = new URLSearchParams({ app });
  if (options?.recordKey) {
    params.set("recordKey", options.recordKey);
  }
  const response = await authFetch(`/api/documents?${params.toString()}`);
  if (!response.ok) {
    throw await readError(response);
  }
  return (await response.json()) as ManagedDocument[];
}

export async function getDocumentCounts(
  app: DocumentApp = "assets",
): Promise<Record<string, number>> {
  const params = new URLSearchParams({ app });
  const response = await authFetch(
    `/api/documents/counts?${params.toString()}`,
  );
  if (!response.ok) {
    throw await readError(response);
  }
  return (await response.json()) as Record<string, number>;
}

export async function uploadDocuments(
  app: DocumentApp,
  recordKey: string,
  files: File[],
): Promise<ManagedDocument[]> {
  if (app !== "assets") {
    throw new DocumentsApiError("App ist nicht dokumententauglich", 400);
  }
  const body = new FormData();
  for (const file of files) {
    body.append("file", file);
  }
  const response = await authFetch(
    `/api/documents/assets/${encodeURIComponent(recordKey)}`,
    {
      method: "POST",
      body,
    },
  );
  if (!response.ok) {
    throw await readError(response);
  }
  return (await response.json()) as ManagedDocument[];
}

export async function deleteDocument(
  app: DocumentApp,
  recordKey: string,
  name: string,
): Promise<void> {
  if (app !== "assets") {
    throw new DocumentsApiError("App ist nicht dokumententauglich", 400);
  }
  const response = await authFetch(
    `/api/documents/assets/${encodeURIComponent(recordKey)}/${encodeURIComponent(name)}`,
    {
      method: "DELETE",
    },
  );
  if (!response.ok) {
    throw await readError(response);
  }
}

export async function fetchDocumentBlob(
  app: DocumentApp,
  recordKey: string,
  name: string,
): Promise<Blob> {
  if (app !== "assets") {
    throw new DocumentsApiError("App ist nicht dokumententauglich", 400);
  }
  const response = await authFetch(
    `/api/documents/assets/${encodeURIComponent(recordKey)}/${encodeURIComponent(name)}`,
  );
  if (!response.ok) {
    throw await readError(response);
  }
  return response.blob();
}

function triggerBlobDownload(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function downloadDocument(
  app: DocumentApp,
  recordKey: string,
  name: string,
): Promise<void> {
  const blob = await fetchDocumentBlob(app, recordKey, name);
  triggerBlobDownload(blob, name);
}

export type OpenDocumentResult =
  | { kind: "image"; url: string; name: string }
  | { kind: "download" };

export async function openDocument(
  app: DocumentApp,
  recordKey: string,
  name: string,
): Promise<OpenDocumentResult> {
  const blob = await fetchDocumentBlob(app, recordKey, name);
  if (isImageDocument(name)) {
    return {
      kind: "image",
      url: URL.createObjectURL(blob),
      name,
    };
  }
  triggerBlobDownload(blob, name);
  return { kind: "download" };
}

export function formatDocumentSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toLocaleString("de", {
      maximumFractionDigits: 1,
    })} KB`;
  }
  return `${(bytes / (1024 * 1024)).toLocaleString("de", {
    maximumFractionDigits: 1,
  })} MB`;
}

export function formatDocumentDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString("de", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function documentExtension(name: string): string | null {
  const dot = name.lastIndexOf(".");
  if (dot < 0 || dot === name.length - 1) {
    return null;
  }
  return name.slice(dot + 1).toLowerCase();
}

export function documentKind(name: string): string {
  const ext = documentExtension(name);
  return ext ? ext.toUpperCase() : "—";
}

export function isImageDocument(name: string): boolean {
  const ext = documentExtension(name);
  return ext !== null && IMAGE_EXTENSIONS.has(ext);
}

export function documentTypeMeta(name: string): DocumentTypeMeta {
  const ext = documentExtension(name);
  if (ext && DOCUMENT_TYPE_META[ext]) {
    return DOCUMENT_TYPE_META[ext];
  }
  return {
    icon: IconFile,
    color: "currentColor",
    label: documentKind(name),
  };
}
