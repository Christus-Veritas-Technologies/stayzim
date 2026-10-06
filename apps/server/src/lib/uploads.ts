import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

import { env } from "@stayzim/env/server";
import { S3Client } from "bun";
import { HTTPException } from "hono/http-exception";

/** Photos are resized on the owner's phone first, so anything near this is a mistake. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** File signatures, so a renamed .exe can't pass as a photo. */
const IMAGE_TYPES = [
  { ext: "jpg", mime: "image/jpeg", magic: [0xff, 0xd8, 0xff] },
  { ext: "png", mime: "image/png", magic: [0x89, 0x50, 0x4e, 0x47] },
  // "RIFF", then "WEBP" at byte 8 (RIFF alone is also WAV and AVI)
  { ext: "webp", mime: "image/webp", magic: [0x52, 0x49, 0x46, 0x46, -1, -1, -1, -1, 0x57, 0x45, 0x42, 0x50] },
] as const;

type Storage = {
  kind: "r2" | "disk";
  put: (key: string, bytes: Uint8Array, type: string) => Promise<void>;
  remove: (key: string) => Promise<void>;
  url: (key: string) => string;
};

/**
 * Cloudflare R2, through Bun's built-in S3 client. Objects are public through
 * the bucket's custom domain (R2_PUBLIC_URL); keys hold a fresh id per file,
 * so set a long cache on that domain.
 */
function r2Storage(): Storage | null {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } = env;
  const endpoint = env.R2_ENDPOINT ?? (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : null);
  if (!endpoint || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_URL) return null;
  const client = new S3Client({
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    bucket: R2_BUCKET,
    endpoint,
    region: "auto",
  });
  return {
    kind: "r2",
    put: async (key, bytes, type) => {
      await client.write(key, bytes, { type });
    },
    remove: (key) => client.delete(key),
    url: (key) => `${R2_PUBLIC_URL}/${key}`,
  };
}

/** Development without R2 credentials: files in UPLOAD_DIR, served by this server at /uploads. */
const UPLOAD_ROOT = path.resolve(env.UPLOAD_DIR);

function diskPath(key: string) {
  const target = path.join(UPLOAD_ROOT, key);
  // Keys are built from ids we generate, but never touch anything outside the folder
  return target.startsWith(UPLOAD_ROOT + path.sep) ? target : null;
}

const diskStorage: Storage = {
  kind: "disk",
  put: async (key, bytes) => {
    const target = diskPath(key);
    if (!target) throw new HTTPException(400, { message: "Bad file name" });
    await mkdir(path.dirname(target), { recursive: true });
    await Bun.write(target, bytes);
  },
  remove: async (key) => {
    const target = diskPath(key);
    if (target) await rm(target, { force: true });
  },
  url: (key) => `${env.BETTER_AUTH_URL}/uploads/${key}`,
};

const storage = r2Storage() ?? diskStorage;

if (storage.kind === "disk" && env.NODE_ENV === "production") {
  throw new Error("Lodge photos need Cloudflare R2 in production. Set the R2_* variables (see apps/server/.env.example).");
}

/** Logged at boot, so a missing R2 setting shows up straight away. */
export function describeStorage() {
  return storage.kind === "r2" ? `Cloudflare R2 bucket "${env.R2_BUCKET}"` : `local folder ${UPLOAD_ROOT} (R2 not configured)`;
}

/** Public URL of a stored file, e.g. https://media.stayzim.co.zw/lodges/abc/xyz.jpg */
export function uploadUrl(key: string) {
  return storage.url(key);
}

/**
 * Checks an uploaded file is a JPG, PNG or WebP under the size limit and
 * stores it as `<folder>/<name>.<ext>`. Returns the key to save and its size.
 */
export async function saveImage(file: unknown, folder: string, name: string) {
  if (!(file instanceof File)) throw new HTTPException(400, { message: "Choose a photo to upload" });
  if (file.size === 0) throw new HTTPException(400, { message: "That photo is empty. Try another one." });
  if (file.size > MAX_UPLOAD_BYTES) throw new HTTPException(413, { message: "That photo is too big (5 MB at most)" });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = IMAGE_TYPES.find((candidate) => candidate.magic.every((byte, index) => byte === -1 || bytes[index] === byte));
  if (!type) throw new HTTPException(415, { message: "Use a JPG, PNG or WebP photo" });

  const key = `${folder}/${name}.${type.ext}`;
  try {
    await storage.put(key, bytes, type.mime);
  } catch (error) {
    if (error instanceof HTTPException) throw error;
    console.error(`[uploads] could not store ${key}:`, error);
    throw new HTTPException(502, { message: "The photo did not save. Try again in a minute." });
  }
  return { key, size: bytes.byteLength };
}

/** Deletes stored files. Missing files are fine (already gone); failures are logged, not thrown. */
export async function removeUploads(keys: string[]) {
  await Promise.all(
    keys.map((key) => storage.remove(key).catch((error) => console.error(`[uploads] could not delete ${key}:`, error))),
  );
}

/**
 * GET /uploads/<key>, only when photos are on local disk. Keys contain a fresh
 * id per file, so browsers may cache them forever.
 */
export async function serveUpload(requestPath: string) {
  if (storage.kind !== "disk") return null;
  const target = diskPath(decodeURIComponent(requestPath.replace(/^\/uploads\//, "")));
  if (!target) return null;
  const file = Bun.file(target);
  if (!(await file.exists())) return null;
  return new Response(file, {
    headers: {
      "Content-Type": file.type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Cross-Origin-Resource-Policy": "cross-origin",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
