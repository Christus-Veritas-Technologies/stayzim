/**
 * Photos are resized on the owner's phone before they upload: a 6 MB camera
 * photo becomes a few hundred KB, which matters on Zimbabwean mobile data.
 */
export type ResizedImage = { blob: Blob; width: number; height: number; name: string };

export const PHOTO_EDGE = 1600;
export const LOGO_EDGE = 512;

export class ImageReadError extends Error {}

export async function resizeImage(
  file: File,
  { maxEdge = PHOTO_EDGE, quality = 0.82, keepTransparency = false }: { maxEdge?: number; quality?: number; keepTransparency?: boolean } = {},
): Promise<ResizedImage> {
  let bitmap: ImageBitmap;
  try {
    // Honours the camera's rotation, so portrait photos stay upright
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ImageReadError("That file isn't a photo we can read. Use a JPG or PNG.");
  }

  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new ImageReadError("This browser can't resize photos. Try Chrome.");
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const png = keepTransparency && file.type === "image/png";
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, png ? "image/png" : "image/jpeg", quality));
  if (!blob) throw new ImageReadError("That photo didn't resize. Try another one.");

  const base = file.name.replace(/\.[^.]+$/, "") || "photo";
  return { blob, width, height, name: `${base}.${png ? "png" : "jpg"}` };
}

/** Form for POST /api/lodge/photos (and /logo, which ignores the size). */
export function photoForm(image: ResizedImage, fields: Record<string, string | undefined> = {}) {
  const form = new FormData();
  form.append("file", image.blob, image.name);
  form.append("width", String(image.width));
  form.append("height", String(image.height));
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) form.append(key, value);
  }
  return form;
}
