/**
 * Settings for `bun test`, set before any module reads them. Owners' dates are
 * Zimbabwe time, so tests run in it too.
 */
Object.assign(process.env, {
  TZ: "Africa/Harare",
  NEXT_PUBLIC_SERVER_URL: "https://api.stayzim.co.zw",
  NEXT_PUBLIC_SITES_DOMAIN: "stayzim.co.zw",
  NEXT_PUBLIC_WHATSAPP_NUMBER: "263771234567",
});
