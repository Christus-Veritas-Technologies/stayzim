/**
 * Settings for `bun test`, set before @stayzim/env/server validates the
 * environment. dotenv never overrides a variable that's already set, so these
 * win over a local .env; the empty R2 settings keep photos on local disk.
 */
Object.assign(process.env, {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://test:test@localhost:5432/stayzim_test",
  CORS_ORIGIN: "https://app.stayzim.co.zw,https://stayzim.co.zw",
  SITES_DOMAIN: "stayzim.co.zw",
  BETTER_AUTH_SECRET: "test-secret-that-is-at-least-32-characters",
  BETTER_AUTH_URL: "https://api.stayzim.co.zw",
  CLIENT_IP_HEADER: "cf-connecting-ip",
  R2_ACCOUNT_ID: "",
  R2_ENDPOINT: "",
  R2_ACCESS_KEY_ID: "",
  R2_SECRET_ACCESS_KEY: "",
  R2_BUCKET: "",
  R2_PUBLIC_URL: "",
  SMTP_HOST: "",
});
