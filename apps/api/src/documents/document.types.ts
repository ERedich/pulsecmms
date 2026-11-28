export const DOCUMENT_APPS = ["assets"] as const;

export type DocumentApp = (typeof DOCUMENT_APPS)[number];

export function isDocumentApp(value: string): value is DocumentApp {
  return (DOCUMENT_APPS as readonly string[]).includes(value);
}

export type DocumentPublic = {
  name: string;
  size: number;
  modifiedAt: string;
  app: DocumentApp;
  recordKey: string;
};
