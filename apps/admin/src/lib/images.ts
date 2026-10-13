/**
 * Photos are resized on the owner's phone before they upload: a 6 MB camera
 * photo becomes a few hundred KB, which matters on Zimbabwean mobile data.
 */
export type ResizedImage = { blob: Blob; width: number; height: number; name: string };

export const PHOTO_EDGE = 1600;
/**
 * Big photos also get smaller copies, which lodge sites send to phones: medium
 * for full-width images, small for thumbnails (COPY_EDGES in apps/server).
 */
export const COPY_EDGES = { medium: 1280, small: 640 } as const;
export const LOGO_EDGE = 512;

export class ImageReadError extends Error {}

export async function resizeImage(
  file: File | Blob,
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

  const base = (file instanceof File ? file.name : "photo").replace(/\.[^.]+$/, "") || "photo";
  return { blob, width, height, name: `${base}.${png ? "png" : "jpg"}` };
}

export type PhotoCopies = { medium: ResizedImage | null; small: ResizedImage | null };

/**
 * The smaller copies of a resized photo, made from the resized one (so it's
 * quick). Each is null when the photo is that small already.
 */
export async function smallerCopies(image: ResizedImage): Promise<PhotoCopies> {
  const copy = async (edge: number, suffix: string, quality: number) => {
    if (Math.max(image.width, image.height) <= edge) return null;
    const resized = await resizeImage(image.blob, { maxEdge: edge, quality });
    return { ...resized, name: image.name.replace(/(\.[^.]+)$/, `-${suffix}$1`) };
  };
  return { medium: await copy(COPY_EDGES.medium, "md", 0.8), small: await copy(COPY_EDGES.small, "sm", 0.78) };
}

/** Form for POST /api/lodge/photos (and /logo, which ignores the size). */
export function photoForm(image: ResizedImage, fields: Record<string, string | undefined> = {}, copies?: PhotoCopies) {
  const form = new FormData();
  form.append("file", image.blob, image.name);
  if (copies?.medium) form.append("medium", copies.medium.blob, copies.medium.name);
  if (copies?.small) form.append("small", copies.small.blob, copies.small.name);
  form.append("width", String(image.width));
  form.append("height", String(image.height));
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) form.append(key, value);
  }
  return form;
}
