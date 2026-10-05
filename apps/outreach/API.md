# Outreach API

Base URL: `http://localhost:9997`

## Auth

All `/api/*` endpoints require:

```
Authorization: Bearer <OUTREACH_PASSWORD>
```

Missing or wrong password → `401`.

Pages (`/dashboard`, `/accounts`, `/contacts`, `/campaign`) use HTTP Basic auth: username `admin`, password `OUTREACH_PASSWORD`.

## Conventions

- JSON in, JSON out. Errors: `{ "error": "<message>" }`.
- Validation errors → `400` with zod issue details.
- Phone numbers: any format with country code (`+263 77 123 4567`, `263771234567`). Stored as digits only. Must be 8–15 digits.
- `account`: id of one of our WhatsApp numbers (`WHATSAPP_ACCOUNTS`, default `wa1`, `wa2`, `wa3`). If omitted, sends rotate across connected accounts.
- Message templates: `{name}` and `{city}` are replaced with the contact's values when the phone number belongs to a saved contact.
- Rate limit: 60 requests/minute on `/api/*` → `429`.

### Daily send limit

Each account may send at most `WHATSAPP_DAILY_LIMIT` messages (default `40`) in any rolling 24 hours. Only `SENT` messages count. When rotating, accounts at their limit are skipped. When every usable account is at its limit, a direct send returns `429` with `retryAt` and a `Retry-After` header. A campaign pauses until a slot frees up.

### Replies

Every direct message to any of our numbers is stored. Groups, status updates and channels are ignored. If the sender is a contact:

- `lastRepliedAt` is set.
- A `REACHED` contact becomes `REPLIED`. A `PENDING` contact who writes first stays `PENDING`.
- A reply of exactly `stop`, `unsubscribe`, `opt out` or `remove me` (any case) sets `DO_NOT_CONTACT`.

### Contact status

| Status | Meaning |
|---|---|
| `PENDING` | Not messaged yet. Picked up by campaigns. |
| `REACHED` | Messaged successfully from any account. Never picked up by campaigns again. |
| `REPLIED` | Was reached, then wrote back. Never picked up by campaigns. |
| `NOT_ON_WHATSAPP` | Number isn't on WhatsApp. Never picked up by campaigns. |
| `FAILED` | Last send errored. Picked up by campaigns only with `retryFailed: true`. |
| `DO_NOT_CONTACT` | Never messaged, not even by `POST /api/messages`. Set manually or by an opt-out reply. |

---

## Sending

### `POST /api/messages`

Sends one message to one phone number immediately, from one account. Logs it. If the number belongs to a contact, updates that contact's status (`REACHED`, `NOT_ON_WHATSAPP`, or `FAILED`; `REPLIED` stays `REPLIED`). Sends even if the contact was already reached. Refuses contacts marked `DO_NOT_CONTACT`.

Body:

```json
{
  "phone": "+263771234567",
  "message": "Hi {name}, thanks for your interest!",
  "account": "wa1"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `phone` | string | yes | |
| `message` | string | yes | 1–4096 chars |
| `account` | string | no | Omit to rotate |

Responses:

| Status | When | Body |
|---|---|---|
| `201` | Sent | `SendResult` |
| `422` | Number not on WhatsApp | `SendResult` with `status: "NOT_ON_WHATSAPP"` |
| `502` | WhatsApp errored while sending | `SendResult` with `status: "FAILED"`, `error` |
| `409` | Number belongs to a `DO_NOT_CONTACT` contact (nothing sent) | `{ error }` |
| `404` | Unknown `account` | `{ error }` |
| `429` | Requested account (or every connected account) is at its daily limit | `{ error, retryAt }` + `Retry-After` header |
| `503` | Requested account (or every account) not connected | `{ error }` |

`SendResult`:

```json
{
  "phone": "263771234567",
  "contactId": "cm1abc...",
  "account": "wa1",
  "status": "SENT",
  "messageId": "cm1xyz...",
  "whatsappMessageId": "true_263771234567@c.us_3EB0..."
}
```

`contactId` is `null` when the number isn't a saved contact. `messageId` is the id of the logged `OutreachMessage`.

### `POST /api/campaigns`

Sends one message to many contacts, one at a time, in the background. Only contacts with status `PENDING` (plus `FAILED` if `retryFailed`) are included, oldest first. Waits a random `minDelaySeconds`–`maxDelaySeconds` between sends. Rotates accounts unless `account` is set. Only one campaign can run at a time. Returns immediately.

Before each send, the contact's status is checked again. Contacts that are no longer `PENDING`/`FAILED` (reached by a direct send, opted out, ...) are skipped. When every usable account is at its daily limit, the campaign pauses (`pausedUntil`) and resumes automatically. It stops early if no account is connected.

Body (all filters optional and combined with AND; no filters = all pending contacts):

```json
{
  "message": "Hi {name}! We have new rooms in {city}.",
  "contactIds": ["cm1abc...", "cm1def..."],
  "phones": ["+263771234567"],
  "city": "Harare",
  "limit": 100,
  "account": "wa2",
  "retryFailed": false,
  "minDelaySeconds": 20,
  "maxDelaySeconds": 60
}
```

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `message` | string | yes | | 1–4096 chars, `{name}`/`{city}` supported |
| `contactIds` | string[] | no | | Only these contacts |
| `phones` | string[] | no | | Only contacts with these numbers (numbers must already be saved as contacts) |
| `city` | string | no | | Case-insensitive exact match |
| `limit` | int | no | | 1–5000, max contacts to message |
| `account` | string | no | rotate | Send everything from this account |
| `retryFailed` | boolean | no | `false` | Include `FAILED` contacts |
| `minDelaySeconds` | number | no | `20` | 5–3600 |
| `maxDelaySeconds` | number | no | `60` | 5–3600, ≥ `minDelaySeconds` |

Responses:

| Status | When | Body |
|---|---|---|
| `202` | Started | `CampaignState` |
| `409` | A campaign is already running, or no contacts match | `{ error }` |
| `404` | Unknown `account` | `{ error }` |
| `503` | Requested account (or every account) not connected | `{ error }` |

Being at the daily limit does not block starting; the campaign waits.

`CampaignState`:

```json
{
  "running": true,
  "stopRequested": false,
  "message": "Hi {name}! We have new rooms in {city}.",
  "startedAt": "2026-10-05T10:00:00.000Z",
  "total": 100,
  "processed": 12,
  "sent": 10,
  "notOnWhatsapp": 1,
  "failed": 1,
  "skipped": 0,
  "nextSendAt": "2026-10-05T10:09:41.000Z"
}
```

`finishedAt` and `stoppedReason` (why it ended early) appear once set. `nextSendAt` is only present while waiting between sends. `pausedUntil` is only present while paused at daily limits.

### `GET /api/campaigns/current`

Returns the running or most recent campaign's `CampaignState`, or `null` if none has run since the server started. Campaign state is in memory; a restart stops a running campaign. Contact statuses and the message log are in the database.

### `POST /api/campaigns/current/stop`

Stops the running campaign before its next send. → `200` `CampaignState`, or `409` if nothing is running.

---

## Contacts

`Contact`:

```json
{
  "id": "cm1abc...",
  "name": "Tendai Moyo",
  "phone": "263771234567",
  "city": "Harare",
  "status": "PENDING",
  "reachedVia": null,
  "lastContactedAt": null,
  "lastRepliedAt": null,
  "createdAt": "2026-10-05T09:00:00.000Z",
  "updatedAt": "2026-10-05T09:00:00.000Z"
}
```

`reachedVia` is the account that first reached the contact.

### `POST /api/contacts`

Adds one contact or a list (max 5000). Phone numbers that already exist, or repeat within the list, are skipped. Existing contacts are not changed. New contacts are `PENDING`. If any item is invalid, the whole request is rejected with `400`.

Body: a single contact or an array.

```json
[
  { "name": "Tendai Moyo", "phone": "+263 77 123 4567", "city": "Harare" },
  { "name": "Rudo Banda", "phone": "263712345678", "city": "Bulawayo" }
]
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | 1–200 chars |
| `phone` | string | yes | Unique |
| `city` | string | yes | 1–100 chars |

→ `201`

```json
{ "received": 2, "created": 2, "skipped": 0 }
```

### `GET /api/contacts`

Lists contacts, newest first.

Query:

| Param | Notes |
|---|---|
| `status` | `PENDING` \| `REACHED` \| `REPLIED` \| `NOT_ON_WHATSAPP` \| `FAILED` \| `DO_NOT_CONTACT` |
| `city` | Case-insensitive exact match |
| `search` | Name contains (case-insensitive) or phone contains |
| `page` | Default `1` |
| `pageSize` | Default `50`, max `500` |

→ `200` `{ "total": 230, "page": 1, "pageSize": 50, "items": [Contact] }`

### `GET /api/contacts/stats`

→ `200`

```json
{
  "total": 230,
  "byStatus": { "PENDING": 180, "REACHED": 30, "REPLIED": 10, "NOT_ON_WHATSAPP": 6, "FAILED": 2, "DO_NOT_CONTACT": 2 }
}
```

### `GET /api/contacts/:id`

→ `200` `Contact` plus `messages: [OutreachMessage]` (newest first), or `404`.

### `PATCH /api/contacts/:id`

Updates any of `name`, `phone`, `city`, `status`. At least one is required. Use `status: "DO_NOT_CONTACT"` to exclude someone, or `status: "PENDING"` to make them eligible for campaigns again.

```json
{ "status": "DO_NOT_CONTACT" }
```

→ `200` `Contact`, `404` not found, `409` phone belongs to another contact.

### `DELETE /api/contacts/:id`

Deletes the contact. Its logged messages are kept, with `contactId` set to `null`. → `204`, or `404`.

---

## Message log

`OutreachMessage`:

```json
{
  "id": "cm1xyz...",
  "contactId": "cm1abc...",
  "phone": "263771234567",
  "account": "wa1",
  "body": "Hi Tendai, thanks for your interest!",
  "status": "SENT",
  "whatsappMessageId": "true_263771234567@c.us_3EB0...",
  "error": null,
  "createdAt": "2026-10-05T10:00:00.000Z"
}
```

`status`: `SENT` | `NOT_ON_WHATSAPP` | `FAILED`. `body` is the final text after `{name}`/`{city}` replacement.

### `GET /api/messages`

Lists send attempts, newest first.

Query: `phone`, `contactId`, `account`, `status`, `page` (default `1`), `pageSize` (default `50`, max `500`).

→ `200` `{ "total": 52, "page": 1, "pageSize": 50, "items": [OutreachMessage] }`

---

## Replies

`InboundMessage`:

```json
{
  "id": "cm1rep...",
  "contactId": "cm1abc...",
  "phone": "263771234567",
  "chatId": "263771234567@c.us",
  "account": "wa1",
  "body": "Yes, I'm interested",
  "type": "chat",
  "whatsappMessageId": "false_263771234567@c.us_3EB0...",
  "createdAt": "2026-10-05T10:05:00.000Z"
}
```

`phone` is `null` when WhatsApp hides the sender behind a `…@lid` id that couldn't be mapped to a number. `type` is the WhatsApp message type (`chat`, `image`, `ptt`, ...). `body` is empty for media without a caption.

### `GET /api/replies`

Lists received messages, newest first.

Query: `phone`, `contactId`, `account`, `page` (default `1`), `pageSize` (default `50`, max `500`).

→ `200` `{ "total": 8, "page": 1, "pageSize": 50, "items": [InboundMessage] }`

---

## WhatsApp accounts

### `GET /api/whatsapp/status`

→ `200`

```json
[
  {
    "account": "wa1",
    "state": "ready",
    "number": "263771111111",
    "pushName": "StayZim",
    "lastSavedAt": "2026-10-05T09:55:00.000Z",
    "startedAt": "2026-10-05T09:50:00.000Z",
    "hasQr": false,
    "usage": { "account": "wa1", "sent": 12, "limit": 40, "remaining": 28 }
  }
]
```

`state`: `disabled` | `starting` | `qr` (waiting for a scan) | `authenticated` | `ready` | `disconnected` | `failed`. `lastSavedAt` is the last session backup to Postgres. `usage.sent` counts the last 24 hours. `usage.resetsAt` is present when `remaining` is `0`.

---

## Pages (browser, Basic auth)

| Page | Shows | Actions |
|---|---|---|
| `GET /` | Redirects to `/dashboard` | |
| `GET /dashboard` | Contact totals, sent/replies (24h and total), reply rate, per-number state and daily usage, running campaign, last 10 sends and replies | Refreshes every 30s |
| `GET /accounts` | Each number's state, pairing QR code, linked number, daily usage, last session backup | Refreshes every 5s until all are connected |
| `GET /contacts` | Contacts with search and status/city filters, 50 per page | Paste-import (`name, phone, city` per line); mark do-not-contact / allow again |
| `GET /campaign` | Current/last campaign progress | Start a campaign (message, city, max contacts, number, delays, retry failed); stop it |

Form posts (`POST /contacts/import`, `POST /contacts/:id/status`, `POST /campaign/start`, `POST /campaign/stop`) must come from these pages: requests from another origin get `403`.

---

## Unauthenticated

| Endpoint | Response |
|---|---|
| `GET /health` | `200` `{ healthy, accounts: [{ account, state }] }`. `503` only if every account has `failed`. |
