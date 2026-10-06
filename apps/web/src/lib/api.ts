import { env } from "@stayzim/env/web";

export type ApiResult<T> = { data: T; error?: undefined; status: number } | { data?: undefined; error: string; status: number };

const OFFLINE = "Could not reach StayZim. Check your connection and try again.";

/**
 * Calls our own API (apps/server) with the session cookie. Never throws:
 * failures come back as one plain sentence in `error`, ready for the screen.
 */
export async function api<T = unknown>(
  path: string,
  { method = "GET", json, form }: { method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"; json?: unknown; form?: FormData } = {},
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}${path}`, {
      method,
      credentials: "include",
      headers: json === undefined ? undefined : { "Content-Type": "application/json" },
      body: form ?? (json === undefined ? undefined : JSON.stringify(json)),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string } & T;
    if (!response.ok) return { error: body.error ?? "Something went wrong. Try again.", status: response.status };
    return { data: body, status: response.status };
  } catch {
    return { error: OFFLINE, status: 0 };
  }
}

/**
 * Uploads a form with progress (fetch can't report upload progress yet).
 * `onProgress` gets 0–1 as the bytes go up.
 */
export function apiUpload<T = unknown>(path: string, form: FormData, onProgress?: (fraction: number) => void): Promise<ApiResult<T>> {
  return new Promise((resolve) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${env.NEXT_PUBLIC_SERVER_URL}${path}`);
    request.withCredentials = true;
    request.responseType = "json";
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    request.onload = () => {
      const body = (request.response ?? {}) as { error?: string } & T;
      if (request.status >= 200 && request.status < 300) resolve({ data: body, status: request.status });
      else resolve({ error: body.error ?? "The photo did not upload. Try again.", status: request.status });
    };
    request.onerror = () => resolve({ error: OFFLINE, status: 0 });
    request.send(form);
  });
}
