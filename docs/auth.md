# Sign-in and email

Owner accounts use [better-auth](https://www.better-auth.com) on `apps/server`, with email sent through our own SMTP setup (Nodemailer).

## How owners get an account

There is **no public sign-up**. StayZim creates every account:

```bash
pnpm --filter @stayzim/auth create-owner --email owner@lodge.co.zw --name "Tendai Moyo"
```

This prints a **temporary password**; send it to the owner on WhatsApp with the login link.

- **First sign-in:** the owner is sent to "Choose your own password". The dashboard and API stay closed (403) until they do.
- **Locked out, and the reset email never arrived:** issue a new temporary password. This also signs them out everywhere.

  ```bash
  pnpm --filter @stayzim/auth create-owner --email owner@lodge.co.zw --reset
  ```

- **Staff account:** add `--admin` (role `ADMIN`).

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

The rate limiter keeps counts in memory, so it resets when the server restarts and only works for a single server process. It reads the client IP from `X-Forwarded-For`, so the server must sit behind a proxy that sets that header (don't expose it directly).

## Flows

**Sign in.** `/login` → `authClient.signIn.email` → session cookie (`stayzim.session_token`) set by the API → `/dashboard`, or `/set-password` if the password is temporary.

**Forgot password.**

1. `/forgot-password` → `authClient.requestPasswordReset` emails a link to `BETTER_AUTH_URL/api/auth/reset-password/:token`.
2. better-auth checks the token and redirects to `/reset-password?token=…`, or to `?error=INVALID_TOKEN` if it expired or was used.
3. The owner sets a new password and logs in again.

**First login.** `/set-password` posts the temporary and new password to `POST /api/account/set-password`. That route calls better-auth's `changePassword`, forwards the refreshed session cookie, and clears `mustChangePassword`.

**Protecting a route.**

- **Server:** add `withSession` and `requireAuth()` from `apps/server/src/lib/session.ts`. `requireAuth({ allowTemporaryPassword: true })` is only for routes that let the owner fix their password.
- **Web:** `src/proxy.ts` sends visitors without a cookie to `/login`. Pages call `authClient.useSession()` to check the session itself.

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
- `CORS_ORIGIN=https://app.stayzim.co.zw`
- `COOKIE_DOMAIN=.stayzim.co.zw`, so the cookie set by `api.` is readable on `app.`, where the route guard checks it
- A new random `BETTER_AUTH_SECRET` of 32+ characters. Changing it signs everyone out.
