import { useEffect, useState } from "react";
import {
  documentTypeMeta,
  fetchDocumentBlob,
  isImageDocument,
  type DocumentApp,
} from "../lib/documents";

type DocumentFileGlyphProps = {
  app: DocumentApp;
  recordKey: string;
  name: string;
  size?: number;
};

export function DocumentFileGlyph(props: DocumentFileGlyphProps) {
  const size = props.size ?? 20;
  const meta = documentTypeMeta(props.name);
  const Icon = meta.icon;
  const showPreview = isImageDocument(props.name);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);

  useEffect(() => {
    if (!showPreview) {
      setPreviewUrl(null);
      setPreviewFailed(false);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setPreviewFailed(false);
    setPreviewUrl(null);

    void fetchDocumentBlob(props.app, props.recordKey, props.name)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setPreviewUrl(url);
      })
      .catch(() => {
        if (!cancelled) setPreviewFailed(true);
      });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [props.app, props.name, props.recordKey, showPreview]);

  if (showPreview && previewUrl && !previewFailed) {
    return (
      <img
        src={previewUrl}
        alt=""
        className="h-8 w-8 shrink-0 rounded border border-outline-variant/70 object-cover"
        onError={() => setPreviewFailed(true)}
      />
    );
  }

  return (
    <span
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center"
      aria-hidden
    >
      <Icon
        size={size}
        stroke={1.75}
        style={
          meta.color === "currentColor" ? undefined : { color: meta.color }
        }
        className={
          meta.color === "currentColor" ? "text-on-surface-variant" : undefined
        }
      />
    </span>
  );
}
