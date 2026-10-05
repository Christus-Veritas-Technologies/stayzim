import type { Child } from "hono/jsx";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/accounts", label: "Numbers" },
  { href: "/contacts", label: "Contacts" },
  { href: "/campaign", label: "Campaign" },
] as const;

const styles = `
:root {
  --bg: #f6f7f9; --surface: #ffffff; --border: #e3e6eb; --text: #1b1f24; --muted: #667085;
  --accent: #128c4a; --accent-text: #ffffff; --danger: #c0392b;
  --ok-bg: #e3f6ea; --ok-fg: #13703d; --warn-bg: #fff4dc; --warn-fg: #8a5a00;
  --bad-bg: #fde7e5; --bad-fg: #a02a1e; --info-bg: #e6effc; --info-fg: #1f4f9c;
  --neutral-bg: #eef0f3; --neutral-fg: #475467;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0f1215; --surface: #171b20; --border: #2a3038; --text: #e8eaed; --muted: #98a2b3;
    --accent: #25b366; --accent-text: #08130c; --danger: #ef6f61;
    --ok-bg: #12301f; --ok-fg: #6fdc9b; --warn-bg: #332709; --warn-fg: #f3c55b;
    --bad-bg: #3a1714; --bad-fg: #f59a8f; --info-bg: #142540; --info-fg: #8fb6f5;
    --neutral-bg: #232931; --neutral-fg: #b4bcc8;
  }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text);
  font: 14px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
a { color: inherit; }
header { background: var(--surface); border-bottom: 1px solid var(--border); }
.bar { max-width: 1120px; margin: 0 auto; padding: 0 16px; display: flex; align-items: center; gap: 24px; height: 56px; }
.brand { font-weight: 600; white-space: nowrap; }
nav { display: flex; gap: 4px; overflow-x: auto; scrollbar-width: none; }
nav::-webkit-scrollbar { display: none; }
nav a { text-decoration: none; padding: 6px 12px; border-radius: 6px; color: var(--muted); white-space: nowrap; }
nav a:hover { background: var(--neutral-bg); color: var(--text); }
nav a.active { background: var(--neutral-bg); color: var(--text); font-weight: 500; }
main { max-width: 1120px; margin: 0 auto; padding: 24px 16px 48px; }
h1 { font-size: 22px; margin: 0 0 4px; font-weight: 600; }
h2 { font-size: 15px; margin: 0 0 12px; font-weight: 600; }
.subtitle { color: var(--muted); margin: 0 0 24px; }
.grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 24px; }
.grid-3 { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
.grid-2 { grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 16px; min-width: 0; }
.stat-label { color: var(--muted); font-size: 13px; }
.stat-value { font-size: 28px; font-weight: 600; font-variant-numeric: tabular-nums; }
.stat-sub { color: var(--muted); font-size: 12px; }
table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--border); vertical-align: top; }
th { color: var(--muted); font-weight: 500; font-size: 12px; text-transform: uppercase; letter-spacing: .03em; }
tr:last-child td { border-bottom: none; }
td.num { font-variant-numeric: tabular-nums; }
.table-wrap { overflow-x: auto; }
.truncate { max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.muted { color: var(--muted); }
.empty { color: var(--muted); padding: 16px 0; text-align: center; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; font-weight: 500; white-space: nowrap; }
.b-ok { background: var(--ok-bg); color: var(--ok-fg); }
.b-warn { background: var(--warn-bg); color: var(--warn-fg); }
.b-bad { background: var(--bad-bg); color: var(--bad-fg); }
.b-info { background: var(--info-bg); color: var(--info-fg); }
.b-neutral { background: var(--neutral-bg); color: var(--neutral-fg); }
.meter { height: 6px; background: var(--neutral-bg); border-radius: 999px; overflow: hidden; margin: 8px 0 4px; }
.meter > div { height: 100%; background: var(--accent); }
.meter.full > div { background: var(--danger); }
form.stack { display: grid; gap: 12px; }
label { display: grid; gap: 4px; font-size: 13px; color: var(--muted); }
input, select, textarea { font: inherit; color: var(--text); background: var(--bg); border: 1px solid var(--border);
  border-radius: 6px; padding: 8px 10px; width: 100%; }
textarea { min-height: 140px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; }
.row { display: flex; gap: 12px; flex-wrap: wrap; align-items: end; }
.row > * { flex: 1 1 140px; }
button { font: inherit; border: 1px solid transparent; border-radius: 6px; padding: 8px 14px; cursor: pointer;
  background: var(--accent); color: var(--accent-text); font-weight: 500; }
button.secondary { background: var(--surface); color: var(--text); border-color: var(--border); }
button.danger { background: var(--danger); color: #fff; }
button.small { padding: 4px 10px; font-size: 12px; }
.notice { padding: 10px 14px; border-radius: 8px; margin-bottom: 16px; }
.qr { background: #fff; padding: 12px; border-radius: 10px; width: 100%; max-width: 280px; display: block; margin: 12px auto; }
.account-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.pagination { display: flex; gap: 8px; justify-content: flex-end; align-items: center; margin-top: 12px; }
@media (max-width: 640px) {
  .bar { gap: 12px; }
  .brand-suffix { display: none; }
  nav a { padding: 6px 8px; }
  .grid-2, .grid-3 { grid-template-columns: 1fr; }
}
`;

export function Layout(props: {
  title: string;
  active: (typeof NAV)[number]["href"];
  /** Reloads the page every N seconds, for live connection/campaign state. */
  refreshSeconds?: number;
  notice?: { kind: "ok" | "bad"; text: string };
  children: Child;
}) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {props.refreshSeconds ? <meta http-equiv="refresh" content={String(props.refreshSeconds)} /> : null}
        <title>{`${props.title} · Outreach`}</title>
        <style dangerouslySetInnerHTML={{ __html: styles }} />
      </head>
      <body>
        <header>
          <div class="bar">
            <span class="brand">
              StayZim<span class="brand-suffix"> Outreach</span>
            </span>
            <nav>
              {NAV.map((item) => (
                <a href={item.href} class={item.href === props.active ? "active" : undefined}>
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </header>
        <main>
          {props.notice ? (
            <div class={`notice ${props.notice.kind === "ok" ? "b-ok" : "b-bad"}`}>{props.notice.text}</div>
          ) : null}
          {props.children}
        </main>
      </body>
    </html>
  );
}

const STATUS_BADGE: Record<string, string> = {
  // Contact statuses
  PENDING: "b-neutral",
  REACHED: "b-info",
  REPLIED: "b-ok",
  NOT_ON_WHATSAPP: "b-warn",
  FAILED: "b-bad",
  DO_NOT_CONTACT: "b-bad",
  // Message statuses
  SENT: "b-info",
  // Connection states
  ready: "b-ok",
  authenticated: "b-info",
  qr: "b-warn",
  starting: "b-neutral",
  disconnected: "b-bad",
  failed: "b-bad",
  disabled: "b-neutral",
  // Campaign states
  running: "b-info",
  paused: "b-warn",
  finished: "b-neutral",
};

export function Badge({ value }: { value: string }) {
  return <span class={`badge ${STATUS_BADGE[value] ?? "b-neutral"}`}>{value.replaceAll("_", " ").toLowerCase()}</span>;
}

export function Stat(props: { label: string; value: string | number; sub?: string }) {
  return (
    <div class="card">
      <div class="stat-label">{props.label}</div>
      <div class="stat-value">{props.value}</div>
      {props.sub ? <div class="stat-sub">{props.sub}</div> : null}
    </div>
  );
}

/** "3m ago", with the full timestamp on hover. */
export function Time({ value }: { value: Date | string | null | undefined }) {
  if (!value) return <span class="muted">—</span>;
  const date = new Date(value);
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  const abs = Math.abs(seconds);
  const unit =
    abs < 60 ? `${abs}s` : abs < 3600 ? `${Math.round(abs / 60)}m` : abs < 86400 ? `${Math.round(abs / 3600)}h` : `${Math.round(abs / 86400)}d`;
  return <time title={date.toLocaleString()}>{seconds >= 0 ? `${unit} ago` : `in ${unit}`}</time>;
}

export function formatPhone(phone: string | null | undefined) {
  return phone ? `+${phone}` : "unknown";
}
