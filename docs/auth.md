# Sign-in and email

Owner accounts use [better-auth](https://www.better-auth.com) on `apps/server`, with email sent through our own SMTP setup (Nodemailer).

## How owners get an account

**Owners sign up themselves** at `/signup` (name, email, password or Google, and a plan), then make their lodge at `/start`. It goes live straight away as a 2-day demo (see [architecture.md](architecture.md#sign-up-and-the-demo)). There's no email check first, so sign-up stays quick; invoices and receipts go to that address. Sign-ups are limited to 5 per IP per 10 minutes.

StayZim can also create an account for an owner, for example after a walk-in:

```bash
pnpm --filter @stayzim/auth create-owner --email owner@lodge.co.zw --name "Tendai Moyo"
```

This prints a **temporary password**; send it to the owner on WhatsApp with the login link.

- **First sign-in:** the owner is sent to "Set your password", beside a preview of their live site. The dashboard and API stay closed (403) until they do.
- **Their lodge:** create it once the login exists, so the dashboard has something to show:

  ```bash
  pnpm --filter @stayzim/db create-lodge --owner owner@lodge.co.zw --name "Mist Valley Lodge" --slug mistvalley --town Nyanga --region Manicaland --whatsapp 263771234567
  ```

  Like a sign-up, the lodge starts as a 2-day demo; add `--paid-months 1` for a lodge that's paid already (record the payment with `mark-paid`). Add `--sample-rooms` for three sample rooms.
- **Locked out, and the reset email never arrived:** issue a new temporary password. This also signs them out everywhere.

  ```bash
  pnpm --filter @stayzim/auth create-owner --email owner@lodge.co.zw --reset
  ```

- **Team account:** add `--admin` (role `ADMIN`). Team accounts land on `/admin/requests` after login, where they answer owners' change requests. Their own visits to lodge sites aren't counted.

## Sign in with Google

"Continue with Google" on `/login` is optional. It shows when the server has `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (setup steps are in `apps/server/.env.example`); `GET /api/account/sign-in-options` tells the login screen.

- **Sign in or sign up:** Google signs in the account with the same (verified) email, linking it on first use, or creates a new one, which goes on to `/start` (`newUserCallbackURL`).
- **Temporary passwords:** if an owner links Google while still on the temporary password StayZim sent, that password is replaced with a random one and the dashboard opens. They can set their own later with Forgot password.
- **Errors** return to `/login?error=…`, shown in plain words by `oauthErrorMessage` (`account_not_linked`, `access_denied`); from the sign-up page they return to `/signup?error=…`.
- **Not yet tested** with a real Google OAuth client.

## Rules

| Rule | Value | Where |
| --- | --- | --- |
| Password length | 8+ characters | `MIN_PASSWORD_LENGTH` in `packages/auth` (mirrored in `apps/web/src/lib/auth-client.ts`) |
| Session length | 30 days; extended at most once a day while in use | `session` in `packages/auth` |
| Wrong details message | "Email or password is wrong" (never says which) | `authErrorMessage` in the web app |
| Sign-in rate limit | 5 attempts per 10 minutes per IP, then 429 | `rateLimit.customRules` |
| Reset requests | 3 per 10 minutes per IP | `rateLimit.customRules` |
| Reset link | Valid 1 hour, single use; same response whether or not the email exists | better-auth |
| After a password reset | All sessions ended, temporary-password flag cleared, "password changed" email sent | `onPasswordReset` |
| After a password change | Other devices signed out, this one stays signed in, "password changed" email sent | `POST /api/account/set-password` |

The rate limiter keeps its counts in Postgres (`rate_limit` table, `rateLimit.storage: "database"`), so they survive restarts and hold across server processes. It counts per visitor IP, read from the header named by `CLIENT_IP_HEADER`:

- Behind Cloudflare, set `CLIENT_IP_HEADER=cf-connecting-ip`. Cloudflare sets it to the visitor's address, and visitors can't fake it.
- The default, `x-forwarded-for`, is only trusted when it holds a single address (better-auth's rule). Behind two proxies it holds two, and better-auth then can't tell visitors apart, so everyone would share one limit.
- Visit records on lodge sites (`clientIp` in `apps/server/src/lib/ip.ts`) read the same header.

In development, without the header, every request counts as 127.0.0.1.

## Flows

**Sign in.** `/login` → `authClient.signIn.email` → session cookie (`stayzim.session_token`) set by the API → `/dashboard` (`/admin/requests` for team accounts), or `/set-password` if the password is temporary. Someone already logged in who opens `/login` goes straight there.

**Forgot password.**

1. `/forgot-password` → `authClient.requestPasswordReset` emails a link to `BETTER_AUTH_URL/api/auth/reset-password/:token`.
2. better-auth checks the token and redirects to `/reset-password?token=…`, or to `?error=INVALID_TOKEN` if it expired or was used.
3. The owner sets a new password and logs in again.

**First login.** `/set-password` posts the new password to `POST /api/account/set-password`. The owner just signed in with the temporary password, so it isn't asked for again: the route replaces the password, signs out other devices (keeping this one), and clears `mustChangePassword`.

**Changing it later** (account menu → Change password) uses the same screen and route with the current password, through better-auth's `changePassword`, which forwards the refreshed session cookie.

**Protecting a route.**

- **Server:** add `withSession` and `requireAuth()` from `apps/server/src/lib/session.ts`. `requireAuth({ allowTemporaryPassword: true })` is only for routes that let the owner fix their password.
- **Server, team only:** `requireAdmin` in `apps/server/src/routes/admin.ts` also checks `role` is `ADMIN`.
- **Web:** `src/proxy.ts` sends visitors without a cookie to `/login` (for `/dashboard`, `/set-password` and `/admin`). Pages call `authClient.useSession()` to check the session itself.

## Email

`packages/mail` sends through any SMTP server with Nodemailer.

| Variable | Example | Notes |
| --- | --- | --- |
| `SMTP_HOST` | `mail.spacemail.com` | Unset means emails are printed to the server console (local development) |
| `SMTP_PORT` | `465` | 465 uses TLS from the first byte; 587 upgrades with STARTTLS. Default 587. |
| `SMTP_USER` | `hello@stayzim.co.zw` | |
| `SMTP_PASS` | | |
| `SMTP_FROM` | `StayZim <hello@stayzim.co.zw>` | Defaults to `StayZim <SMTP_USER>` |

- **Connection check:** at boot the server connects and logs `[mail] SMTP connection OK` or the error, so a wrong password shows up straight away.
- **Templates** (`packages/mail/src/templates.ts`): password reset and password changed. They use inline styles and tables so they render in Gmail and Outlook, and every message has a plain-text version.

  To add a template, write a function that returns `{ to, subject, text, html }` and pass it to `sendEmail()`.

## Production settings

- `BETTER_AUTH_URL=https://api.stayzim.co.zw`
- `WEB_URL=https://app.stayzim.co.zw`
- `CORS_ORIGIN=https://app.stayzim.co.zw,https://stayzim.co.zw` (a list; lodge subdomains are allowed on top of it)
- `COOKIE_DOMAIN=.stayzim.co.zw`, so the cookie set by `api.` is readable on `app.`, where the route guard checks it
- A new random `BETTER_AUTH_SECRET` of 32+ characters. Changing it signs everyone out.
