/** Who and what the browser tests use. CI creates them (.github/workflows/ci.yml). */
export const E2E = {
  baseURL: process.env.E2E_BASE_URL ?? "http://localhost:9999",
  email: process.env.E2E_EMAIL ?? "rudo@mistvalley.test",
  password: process.env.E2E_PASSWORD ?? "testpass123",
  /** The signed-in owner's lodge; it needs rooms and a WhatsApp number, on Growth (it takes bookings) */
  lodge: process.env.E2E_LODGE ?? "mistvalley",
  /** A Starter lodge with rooms and WhatsApp: its Book buttons stay WhatsApp links */
  starterLodge: process.env.E2E_STARTER_LODGE ?? "cliffview",
  /** The API, for checks a guest's browser would make (availability) */
  apiURL: process.env.E2E_API_URL ?? "http://localhost:9998",
};

/** The signed-in owner's session, saved by auth.setup.ts */
export const OWNER_STATE = "e2e/.auth/owner.json";

/** http://mistvalley.localhost:9999 (Chromium sends *.localhost to this machine). */
export function lodgeSiteUrl(slug = E2E.lodge) {
  const url = new URL(E2E.baseURL);
  url.hostname = `${slug}.${url.hostname}`;
  return url.origin;
}
