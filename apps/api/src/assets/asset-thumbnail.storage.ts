import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const ASSET_THUMBNAIL_MAX_BYTES = 2 * 1024 * 1024;

export function assetUploadsDir(): string {
  return join(process.cwd(), "uploads", "assets");
}

export function thumbnailPublicUrl(filename: string): string {
  return `/api/uploads/assets/${encodeURIComponent(filename)}`;
}

export function extensionForMime(mime: string): string | null {
  return ALLOWED_MIME[mime] ?? null;
}

export function isAllowedThumbnailMime(mime: string): boolean {
  return mime in ALLOWED_MIME;
}

export async function ensureAssetUploadsDir(): Promise<string> {
  const dir = assetUploadsDir();
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function writeAssetThumbnail(
  assetUid: string,
  mime: string,
  buffer: Buffer,
): Promise<string> {
  const ext = extensionForMime(mime);
  if (!ext) {
    throw new Error("Unsupported thumbnail mime type");
  }
  const dir = await ensureAssetUploadsDir();
  const filename = `${assetUid}.${ext}`;
  await writeFile(join(dir, filename), buffer);
  return filename;
}

export async function removeAssetThumbnailFile(
  filename: string | null | undefined,
): Promise<void> {
  if (!filename) return;
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return;
  }
  try {
    await unlink(join(assetUploadsDir(), filename));
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as { code?: string }).code
        : undefined;
    if (code !== "ENOENT") {
      throw error;
    }
  }
}

export function absoluteThumbnailPath(filename: string): string {
  return join(assetUploadsDir(), filename);
}
