# Browser tests

Playwright smoke tests for the whole stack: the landing page, an owner signing in, and a lodge site. They run against apps that are already running, so start them first.

```bash
pnpm dev                          # web on 9999, API on 9998 (from the repo root)
pnpm --filter web e2e             # in another terminal
```

They sign in as `rudo@mistvalley.test` / `testpass123` and open the lodge `mistvalley`, which needs rooms (Garden Cottage among them) and a WhatsApp number. Other values come from:

| Variable | Default |
| --- | --- |
| `E2E_BASE_URL` | `http://localhost:9999` |
| `E2E_EMAIL`, `E2E_PASSWORD` | the test owner above |
| `E2E_LODGE` | `mistvalley` |

A login straight from `create-owner` works too: the test sets its password to `E2E_PASSWORD` on the first-login screen. CI creates the owner and lodge with the scripts (`.github/workflows/ci.yml`).

Sign-in is rate limited to 5 attempts per 10 minutes per IP, and the counts live in the database, so they survive restarts. If a run fails with "Too many attempts", clear them in your local database: `DELETE FROM rate_limit;`.

Test files end in `.e2e.ts`, so `bun test` (the unit tests) skips them. Failed runs keep a trace in `test-results/`; open it with `pnpm exec playwright show-trace <file>`.
