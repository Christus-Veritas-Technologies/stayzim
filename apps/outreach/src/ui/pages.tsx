import prisma from "@stayzim/db";
import { env } from "@stayzim/env/outreach";
import { Hono, type Context } from "hono";

import {
  CONTACT_STATUSES,
  getAccountUsage,
  getCampaign,
  getContactStats,
  getDashboardStats,
  OutreachError,
  startCampaign,
  stopCampaign,
} from "../outreach";
import { startCampaignSchema } from "../routes/campaigns";
import { contactSchema } from "../routes/contacts";
import { getStatuses, normalizePhone } from "../whatsapp";
import { Badge, formatPhone, Layout, Stat, Time } from "./layout";

const PAGE_SIZE = 50;

/** Notices travel as ?ok= / ?error= after a form redirect. */
function noticeFrom(c: Context) {
  const ok = c.req.query("ok");
  const error = c.req.query("error");
  if (error) return { kind: "bad" as const, text: error };
  if (ok) return { kind: "ok" as const, text: ok };
  return undefined;
}

function redirectWith(c: Context, path: string, kind: "ok" | "error", text: string) {
  const url = new URL(path, "http://local");
  url.searchParams.set(kind, text);
  return c.redirect(`${url.pathname}${url.search}`, 303);
}

function Meter({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  return (
    <div class={`meter${used >= limit ? " full" : ""}`}>
      <div style={`width:${pct}%`} />
    </div>
  );
}

export const ui = new Hono();

ui.get("/", (c) => c.redirect("/dashboard"));

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

ui.get("/dashboard", async (c) => {
  const stats = await getDashboardStats();
  const accounts = getStatuses();
  const campaign = getCampaign();
  const { byStatus } = stats.contacts;
  const reached = byStatus.REACHED + byStatus.REPLIED;

  return c.html(
    <Layout title="Dashboard" active="/dashboard" refreshSeconds={30}>
      <h1>Dashboard</h1>
      <p class="subtitle">Outreach across {accounts.length} WhatsApp numbers. Refreshes every 30s.</p>

      <div class="grid">
        <Stat label="Contacts" value={stats.contacts.total} sub={`${byStatus.PENDING} not yet messaged`} />
        <Stat label="Reached" value={reached} sub={`${stats.sentTotal} messages sent in total`} />
        <Stat label="Replied" value={byStatus.REPLIED} sub={`${Math.round(stats.replyRate * 100)}% of reached contacts`} />
        <Stat label="Sent (24h)" value={stats.sent24h} sub={`${stats.failed24h} failed or not on WhatsApp`} />
        <Stat label="Replies (24h)" value={stats.replies24h} sub={`${stats.repliesTotal} in total`} />
      </div>

      <div class="grid grid-3">
        {accounts.map((account) => {
          const usage = stats.usage.find((u) => u.account === account.account)!;
          return (
            <div class="card">
              <div class="account-head">
                <h2 style="margin:0">{account.account}</h2>
                <Badge value={account.state} />
              </div>
              <div class="muted">{account.number ? formatPhone(account.number) : "Not linked"}</div>
              <Meter used={usage.sent} limit={usage.limit} />
              <div class="stat-sub">
                {usage.sent} / {usage.limit} sent in the last 24h
                {usage.resetsAt ? (
                  <>
                    {" · next slot "}
                    <Time value={usage.resetsAt} />
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {campaign?.running ? (
        <div class="card" style="margin-bottom:24px">
          <div class="account-head">
            <h2 style="margin:0">Campaign running</h2>
            <a href="/campaign">View</a>
          </div>
          <Meter used={campaign.processed} limit={campaign.total} />
          <div class="stat-sub">
            {campaign.processed} / {campaign.total} processed · {campaign.sent} sent
            {campaign.pausedUntil ? " · paused at daily limits" : ""}
          </div>
        </div>
      ) : null}

      <div class="grid grid-2">
        <div class="card">
          <h2>Recent sends</h2>
          {stats.recentSent.length === 0 ? (
            <div class="empty">Nothing sent yet</div>
          ) : (
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>To</th>
                    <th>From</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentSent.map((message) => (
                    <tr>
                      <td>
                        <Time value={message.createdAt} />
                      </td>
                      <td>
                        {message.contactName ?? formatPhone(message.phone)}
                        {message.contactName ? <div class="muted">{formatPhone(message.phone)}</div> : null}
                      </td>
                      <td>{message.account}</td>
                      <td>
                        <Badge value={message.status ?? ""} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div class="card">
          <h2>Recent replies</h2>
          {stats.recentReplies.length === 0 ? (
            <div class="empty">No replies yet</div>
          ) : (
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentReplies.map((reply) => (
                    <tr>
                      <td>
                        <Time value={reply.createdAt} />
                      </td>
                      <td>
                        {reply.contactName ?? formatPhone(reply.phone)}
                        {reply.contactName ? <div class="muted">{formatPhone(reply.phone)}</div> : null}
                      </td>
                      <td>{reply.account}</td>
                      <td class="truncate" title={reply.body}>
                        {reply.body || <span class="muted">[{reply.type}]</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>,
  );
});

// ---------------------------------------------------------------------------
// Numbers: connection state + QR codes
// ---------------------------------------------------------------------------

ui.get("/accounts", async (c) => {
  const accounts = getStatuses();
  const usage = await Promise.all(accounts.map((account) => getAccountUsage(account.account)));
  const allReady = accounts.every((account) => account.state === "ready");

  return c.html(
    <Layout title="Numbers" active="/accounts" refreshSeconds={allReady ? 30 : 5}>
      <h1>WhatsApp numbers</h1>
      <p class="subtitle">
        Scan a QR code with the phone for that number: WhatsApp → Linked devices → Link a device. Refreshes every{" "}
        {allReady ? "30" : "5"}s.
      </p>

      <div class="grid grid-3">
        {accounts.map((account, i) => {
          const u = usage[i]!;
          return (
            <div class="card">
              <div class="account-head">
                <h2 style="margin:0">{account.account}</h2>
                <Badge value={account.state} />
              </div>

              {account.qrDataUrl ? (
                <img class="qr" src={account.qrDataUrl} alt={`Pairing QR code for ${account.account}`} />
              ) : account.state === "ready" ? (
                <p>
                  Linked as <strong>{account.pushName ?? "unknown"}</strong>
                  <br />
                  <span class="muted">{formatPhone(account.number)}</span>
                </p>
              ) : (
                <p class="muted">
                  {account.state === "starting" || account.state === "authenticated"
                    ? "Starting WhatsApp Web…"
                    : account.state === "disabled"
                      ? "WhatsApp is disabled (WHATSAPP_ENABLED=false)."
                      : "Not connected."}
                </p>
              )}

              {account.lastError && account.state !== "ready" ? (
                <p class="b-bad notice" style="margin:8px 0">
                  {account.lastError}
                </p>
              ) : null}

              <Meter used={u.sent} limit={u.limit} />
              <div class="stat-sub">
                {u.sent} / {u.limit} sent in the last 24h
              </div>
              <div class="stat-sub">
                Session backed up: <Time value={account.lastSavedAt} />
              </div>
            </div>
          );
        })}
      </div>
    </Layout>,
  );
});

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

ui.get("/contacts", async (c) => {
  const status = CONTACT_STATUSES.find((s) => s === c.req.query("status"));
  const city = c.req.query("city")?.trim() || undefined;
  const q = c.req.query("q")?.trim() || undefined;
  const page = Math.max(1, Number(c.req.query("page")) || 1);

  const where = {
    ...(status && { status }),
    ...(city && { city: { equals: city, mode: "insensitive" as const } }),
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" as const } },
        { phone: { contains: normalizePhone(q) || q } },
      ],
    }),
  };

  const [total, contacts, stats, cities] = await Promise.all([
    prisma.contact.count({ where }),
    prisma.contact.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    getContactStats(),
    prisma.contact.findMany({ distinct: ["city"], select: { city: true }, orderBy: { city: "asc" } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const back = c.req.path + (new URL(c.req.url).search || "");
  const pageLink = (p: number) => {
    const params = new URLSearchParams({ ...(status && { status }), ...(city && { city }), ...(q && { q }), page: String(p) });
    return `/contacts?${params}`;
  };

  return c.html(
    <Layout title="Contacts" active="/contacts" notice={noticeFrom(c)}>
      <h1>Contacts</h1>
      <p class="subtitle">
        {stats.total} contacts · {stats.byStatus.PENDING} pending · {stats.byStatus.REACHED + stats.byStatus.REPLIED}{" "}
        reached · {stats.byStatus.REPLIED} replied
      </p>

      <div class="card" style="margin-bottom:16px">
        <h2>Add contacts</h2>
        <form class="stack" method="post" action="/contacts/import">
          <label>
            One per line: name, phone (with country code), city
            <textarea
              name="lines"
              required
              placeholder={"Tendai Moyo, +263 77 123 4567, Harare\nRudo Banda, 263712345678, Bulawayo"}
            />
          </label>
          <div>
            <button type="submit">Add contacts</button>
            <span class="muted" style="margin-left:12px">
              Numbers that already exist are skipped.
            </span>
          </div>
        </form>
      </div>

      <div class="card">
        <form method="get" action="/contacts" class="row" style="margin-bottom:12px">
          <label>
            Search
            <input name="q" value={q ?? ""} placeholder="Name or phone" />
          </label>
          <label>
            Status
            <select name="status">
              <option value="">All</option>
              {CONTACT_STATUSES.map((s) => (
                <option value={s} selected={s === status}>
                  {s.replaceAll("_", " ").toLowerCase()}
                </option>
              ))}
            </select>
          </label>
          <label>
            City
            <select name="city">
              <option value="">All</option>
              {cities.map(({ city: name }) => (
                <option value={name} selected={name.toLowerCase() === city?.toLowerCase()}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <div style="flex:0 0 auto">
            <button type="submit" class="secondary">
              Filter
            </button>
          </div>
        </form>

        {contacts.length === 0 ? (
          <div class="empty">No contacts{status || city || q ? " match these filters" : " yet"}</div>
        ) : (
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>City</th>
                  <th>Status</th>
                  <th>Reached via</th>
                  <th>Last messaged</th>
                  <th>Last reply</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr>
                    <td>{contact.name}</td>
                    <td class="num">{formatPhone(contact.phone)}</td>
                    <td>{contact.city}</td>
                    <td>
                      <Badge value={contact.status} />
                    </td>
                    <td>{contact.reachedVia ?? <span class="muted">—</span>}</td>
                    <td>
                      <Time value={contact.lastContactedAt} />
                    </td>
                    <td>
                      <Time value={contact.lastRepliedAt} />
                    </td>
                    <td>
                      <form method="post" action={`/contacts/${contact.id}/status`}>
                        <input type="hidden" name="back" value={back} />
                        {contact.status === "DO_NOT_CONTACT" ? (
                          <button class="small secondary" name="status" value="PENDING">
                            Allow
                          </button>
                        ) : (
                          <button class="small secondary" name="status" value="DO_NOT_CONTACT">
                            Do not contact
                          </button>
                        )}
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div class="pagination">
          <span class="muted">
            {total} result{total === 1 ? "" : "s"} · page {page} of {pages}
          </span>
          {page > 1 ? <a href={pageLink(page - 1)}>← Prev</a> : null}
          {page < pages ? <a href={pageLink(page + 1)}>Next →</a> : null}
        </div>
      </div>
    </Layout>,
  );
});

ui.post("/contacts/import", async (c) => {
  const body = await c.req.parseBody();
  const lines = String(body.lines ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const valid: { name: string; phone: string; city: string }[] = [];
  const invalid: number[] = [];
  lines.forEach((line, i) => {
    // Header rows from a pasted spreadsheet
    if (i === 0 && /phone/i.test(line) && /name/i.test(line)) return;

    // Last two columns are phone and city; everything before is the name (which may contain commas)
    const parts = line.split(/[,;\t]/).map((part) => part.trim());
    const city = parts.pop();
    const phone = parts.pop();
    const parsed = contactSchema.safeParse({ name: parts.join(", "), phone, city });
    if (parsed.success) valid.push(parsed.data);
    else invalid.push(i + 1);
  });

  if (valid.length === 0) {
    return redirectWith(c, "/contacts", "error", "No valid lines. Use: name, phone (with country code), city");
  }

  const { count } = await prisma.contact.createMany({ data: valid, skipDuplicates: true });
  const skipped = valid.length - count;
  const parts = [`Added ${count} contact${count === 1 ? "" : "s"}`];
  if (skipped) parts.push(`${skipped} already existed`);
  if (invalid.length) parts.push(`invalid line${invalid.length === 1 ? "" : "s"}: ${invalid.slice(0, 20).join(", ")}`);
  return redirectWith(c, "/contacts", invalid.length ? "error" : "ok", parts.join(" · "));
});

ui.post("/contacts/:id/status", async (c) => {
  const body = await c.req.parseBody();
  const status = body.status === "DO_NOT_CONTACT" || body.status === "PENDING" ? body.status : undefined;
  const back = typeof body.back === "string" && body.back.startsWith("/contacts") ? body.back : "/contacts";
  if (!status) return redirectWith(c, back, "error", "Unknown status");

  const contact = await prisma.contact.findUnique({ where: { id: c.req.param("id") } });
  if (!contact) return redirectWith(c, back, "error", "Contact not found");

  // "Allow" puts an opted-out contact back to where they were: reached contacts stay reached
  const nextStatus = status === "PENDING" && contact.lastContactedAt ? "REACHED" : status;
  await prisma.contact.update({ where: { id: contact.id }, data: { status: nextStatus } });
  return redirectWith(
    c,
    back,
    "ok",
    status === "DO_NOT_CONTACT" ? `${contact.name} won't be messaged again` : `${contact.name} can be messaged again`,
  );
});

// ---------------------------------------------------------------------------
// Campaign
// ---------------------------------------------------------------------------

ui.get("/campaign", async (c) => {
  const campaign = getCampaign();
  const [stats, cities, usage] = await Promise.all([
    getContactStats(),
    prisma.contact.findMany({
      where: { status: "PENDING" },
      distinct: ["city"],
      select: { city: true },
      orderBy: { city: "asc" },
    }),
    Promise.all(getStatuses().map((account) => getAccountUsage(account.account))),
  ]);
  const accounts = getStatuses();
  const remainingToday = usage.reduce(
    (sum, u, i) => sum + (accounts[i]?.state === "ready" ? u.remaining : 0),
    0,
  );

  return c.html(
    <Layout
      title="Campaign"
      active="/campaign"
      notice={noticeFrom(c)}
      refreshSeconds={campaign?.running ? 10 : undefined}
    >
      <h1>Campaign</h1>
      <p class="subtitle">
        Message pending contacts one at a time, rotating across connected numbers. Each number sends at most{" "}
        {env.WHATSAPP_DAILY_LIMIT} messages per 24h; {remainingToday} sends left right now.
      </p>

      {campaign ? (
        <div class="card" style="margin-bottom:16px">
          <div class="account-head">
            <h2 style="margin:0">{campaign.running ? "Current campaign" : "Last campaign"}</h2>
            <Badge value={campaign.running ? (campaign.pausedUntil ? "paused" : "running") : "finished"} />
          </div>
          <Meter used={campaign.processed} limit={campaign.total} />
          <div class="grid" style="margin:12px 0 0">
            <Stat label="Processed" value={`${campaign.processed} / ${campaign.total}`} />
            <Stat label="Sent" value={campaign.sent} />
            <Stat label="Not on WhatsApp" value={campaign.notOnWhatsapp} />
            <Stat label="Failed" value={campaign.failed} />
            <Stat label="Skipped" value={campaign.skipped} />
          </div>
          <p class="muted">
            Started <Time value={campaign.startedAt} />
            {campaign.nextSendAt ? (
              <>
                {" · next send "}
                <Time value={campaign.nextSendAt} />
              </>
            ) : null}
            {campaign.pausedUntil ? (
              <>
                {" · all numbers at their daily limit, resuming "}
                <Time value={campaign.pausedUntil} />
              </>
            ) : null}
            {campaign.finishedAt ? (
              <>
                {" · finished "}
                <Time value={campaign.finishedAt} />
              </>
            ) : null}
            {campaign.stoppedReason ? ` · ${campaign.stoppedReason}` : ""}
          </p>
          <p class="muted truncate" title={campaign.message}>
            Message: {campaign.message}
          </p>
          {campaign.running ? (
            <form method="post" action="/campaign/stop">
              <button class="danger" type="submit" disabled={campaign.stopRequested}>
                {campaign.stopRequested ? "Stopping…" : "Stop campaign"}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      {campaign?.running ? null : (
        <div class="card">
          <h2>Start a campaign</h2>
          <p class="muted" style="margin-top:0">
            {stats.byStatus.PENDING} pending contacts. Contacts that were already reached, replied, opted out or
            aren't on WhatsApp are never included.
          </p>
          <form class="stack" method="post" action="/campaign/start">
            <label>
              Message — use {"{name}"} and {"{city}"} to personalise
              <textarea name="message" required placeholder="Hi {name}! Thanks for your interest in places in {city}…" />
            </label>
            <div class="row">
              <label>
                City
                <select name="city">
                  <option value="">All cities</option>
                  {cities.map(({ city }) => (
                    <option value={city}>{city}</option>
                  ))}
                </select>
              </label>
              <label>
                Max contacts
                <input name="limit" type="number" min="1" max="5000" placeholder="All" />
              </label>
              <label>
                Send from
                <select name="account">
                  <option value="">Rotate all numbers</option>
                  {accounts.map((account) => (
                    <option value={account.account}>
                      {account.account} ({account.state})
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div class="row">
              <label>
                Min delay between messages (s)
                <input name="minDelaySeconds" type="number" min="5" max="3600" value="20" />
              </label>
              <label>
                Max delay (s)
                <input name="maxDelaySeconds" type="number" min="5" max="3600" value="60" />
              </label>
              <label style="flex-direction:row;display:flex;align-items:center;gap:8px">
                <input type="checkbox" name="retryFailed" style="width:auto" />
                Retry contacts that failed before
              </label>
            </div>
            <div>
              <button type="submit">Start campaign</button>
            </div>
          </form>
        </div>
      )}
    </Layout>,
  );
});

ui.post("/campaign/start", async (c) => {
  const body = await c.req.parseBody();
  const text = (key: string) => (typeof body[key] === "string" && body[key] ? (body[key] as string) : undefined);

  const parsed = startCampaignSchema.safeParse({
    message: text("message"),
    city: text("city"),
    account: text("account"),
    limit: text("limit") ? Number(text("limit")) : undefined,
    retryFailed: body.retryFailed === "on",
    minDelaySeconds: text("minDelaySeconds") ? Number(text("minDelaySeconds")) : undefined,
    maxDelaySeconds: text("maxDelaySeconds") ? Number(text("maxDelaySeconds")) : undefined,
  });
  if (!parsed.success) {
    return redirectWith(c, "/campaign", "error", parsed.error.issues.map((issue) => issue.message).join("; "));
  }

  try {
    const started = await startCampaign(parsed.data);
    return redirectWith(c, "/campaign", "ok", `Campaign started for ${started?.total} contacts`);
  } catch (error) {
    if (error instanceof OutreachError) return redirectWith(c, "/campaign", "error", error.message);
    throw error;
  }
});

ui.post("/campaign/stop", (c) => {
  try {
    stopCampaign();
    return redirectWith(c, "/campaign", "ok", "Stopping after the current message");
  } catch (error) {
    if (error instanceof OutreachError) return redirectWith(c, "/campaign", "error", error.message);
    throw error;
  }
});
