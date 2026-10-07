# Browser tests

Playwright tests for the whole stack:

- `auth.setup.ts` signs the owner and the StayZim team account in through the login form once and saves both sessions (`e2e/.auth`, gitignored) for the tests that need the dashboard or the team's screens.
- `smoke.e2e.ts` checks the landing page, the owner's rooms, and a lodge site's Book on WhatsApp links.
- `cms.e2e.ts` checks the CMS end to end: room details and hiding, guest info, an owner's booking and cancel, a guest's booking the owner confirms, instant bookings (Confirm bookings automatically), and a Starter site that stays on WhatsApp. Dates are picked at random far ahead, so repeated runs don't collide.
- `templates.e2e.ts` opens each of the nine designed templates (in the preview) at 360px: the rooms, a Book link and Find us are there, and nothing scrolls sideways. It also checks that the enquiry bar opens the booking sheet with the dates picked, and that the review score, a guest's quote and a journal post the team adds show on a Pro site.
- `mobile.e2e.ts` checks that public pages, a lodge site and every dashboard screen fit a 360px phone without scrolling sideways. They run against apps that are already running, so start them first.

```bash
pnpm dev                          # web on 9999, API on 9998 (from the repo root)
pnpm --filter web e2e             # in another terminal
```

They sign in as `rudo@mistvalley.test` / `testpass123` and open the lodge `mistvalley`, which needs rooms (Garden Cottage among them) and a WhatsApp number. Other values come from:

| Variable | Default |
| --- | --- |
| `E2E_BASE_URL` | `http://localhost:9999` |
| `E2E_EMAIL`, `E2E_PASSWORD` | the test owner above |
| `E2E_LODGE` | `mistvalley` (Growth: it takes bookings) |
| `E2E_STARTER_LODGE` | `cliffview` (Starter, with rooms and a WhatsApp number) |
| `E2E_PRO_LODGE` | `ridgeview` (Pro, with rooms and a WhatsApp number) |
| `E2E_TEAM_EMAIL` | `team@e2e.test` (made with `create-owner --admin`, same password) |
| `E2E_API_URL` | `http://localhost:9998` |

A login straight from `create-owner` works too: the test sets its password to `E2E_PASSWORD` on the first-login screen. CI creates the owners, their lodges and the team account with the scripts (`.github/workflows/ci.yml`).

Sign-in is rate limited to 5 attempts per 10 minutes per IP, and the counts live in the database, so they survive restarts. If a run fails with "Too many attempts", clear them in your local database: `DELETE FROM rate_limit;`.

Test files end in `.e2e.ts`, so `bun test` (the unit tests) skips them. Failed runs keep a trace in `test-results/`; open it with `pnpm exec playwright show-trace <file>`.
