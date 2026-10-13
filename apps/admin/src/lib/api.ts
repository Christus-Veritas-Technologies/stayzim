import { env } from "@/lib/public-env";

export type ApiResult<T> = { data: T; error?: undefined; status: number } | { data?: undefined; error: string; status: number };

const OFFLINE = "Could not reach StayZim. Check your connection and try again.";

type Options = { method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"; json?: unknown; form?: FormData };

async function call<T>(url: string, { method = "GET", json, form }: Options): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method,
      credentials: "include",
      headers: json === undefined ? undefined : { "Content-Type": "application/json" },
      body: form ?? (json === undefined ? undefined : JSON.stringify(json)),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string; message?: string } & T;
    if (!response.ok) return { error: body.error ?? body.message ?? "Something went wrong. Try again.", status: response.status };
    return { data: body, status: response.status };
  } catch {
    return { error: OFFLINE, status: 0 };
  }
}

/** The API (apps/server), with the team member's session cookie. Never throws: failures are one sentence in `error`. */
export function api<T = unknown>(path: string, options: Options = {}) {
  return call<T>(`${env.NEXT_PUBLIC_SERVER_URL}${path}`, options);
}

/** This app's own server: the WhatsApp outreach (/api/outreach/*). */
export function outreachApi<T = unknown>(path: string, options: Options = {}) {
  return call<T>(`/api/outreach${path}`, options);
}

/** Uploads a form with progress (fetch can't report upload progress yet). */
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
