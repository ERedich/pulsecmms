/** Simple sRGB luminance (0–1), not gamma-expanded. Light chips use black text. */
const LIGHT_CHIP_LUMINANCE = 0.55;

export function tokenTone(
  color: string | undefined,
): { backgroundColor: string; color: string } | null {
  if (!color) return null;
  const match = /^#?([0-9a-f]{6})$/i.exec(color.trim());
  const hex = match?.[1];
  if (!hex) return null;
  const value = Number.parseInt(hex, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return {
    backgroundColor: `#${hex}`,
    color: luminance >= LIGHT_CHIP_LUMINANCE ? "#000000" : "#ffffff",
  };
}
