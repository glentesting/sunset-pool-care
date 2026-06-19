/**
 * Client-side image compression for the Assessment Wizard photo slots.
 *
 * Techs shoot full-res phone photos at the pool; we down-scale + re-encode to
 * JPEG before storing in wizard state (and the localStorage draft). Keeps the
 * draft under the localStorage quota and the eventual upload payload sane.
 *
 * Browser-only (uses canvas). No dependency — the platform already has
 * everything we need.
 */

const MAX_DIMENSION = 1280; // longest edge, px
const JPEG_QUALITY = 0.6;

export async function compressImage(file: File): Promise<string> {
  const bitmap = await loadBitmap(file);

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    // Canvas unavailable — fall back to the raw file as a data URL.
    return fileToDataUrl(file);
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  if ("close" in bitmap) (bitmap as ImageBitmap).close();

  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // Some formats (e.g. certain HEIC) throw — fall through to <img>.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not load image"));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}
