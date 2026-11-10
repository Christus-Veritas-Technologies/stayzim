"use client";

import { Badge } from "@stayzim/ui/components/badge";
import { Button } from "@stayzim/ui/components/button";
import { Card } from "@stayzim/ui/components/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@stayzim/ui/components/collapsible";
import { Progress } from "@stayzim/ui/components/progress";
import { Tabs, TabsList, TabsTab } from "@stayzim/ui/components/tabs";
import { ChevronDown, LogOut, QrCode, RotateCcw, Smartphone } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AgentControl } from "@/components/agent-control";
import { LoadError, LoadingCards, Page, PageHeader, PageSection, Panel } from "@/components/page";
import { formatShortWhen, formatWhen } from "@/lib/format";
import { outreachApi } from "@/lib/api";
import { formatPhone } from "@/lib/labels";
import { useApi } from "@/lib/use-api";

type ConnectionState = "disabled" | "starting" | "qr" | "authenticated" | "ready" | "disconnected" | "failed" | "stopped";

type NumberStatus = {
  account: string;
  state: ConnectionState;
  qrDataUrl?: string;
  number?: string;
  pushName?: string;
  lastError?: string;
  lastSavedAt?: string;
  lastCheckedAt?: string;
  lastSyncedAt?: string;
  lastSyncFound?: number;
  lastSyncError?: string;
  lastInboundAt?: string;
  lastInboundError?: string;
  retryAt?: string;
  startedAt: string;
  usage?: { sent: number; limit: number; remaining: number; resetsAt?: string };
};

type NumberLog = {
  log: { at: string; error: boolean; text: string }[];
  /** The latest messages its WhatsApp Web holds, or why they couldn't be read; null when it isn't connected */
  messages: { chat: string; fromMe: boolean; type: string; at: string; body: string }[] | { error: string } | null;
};

/** A number's own log and the latest messages its WhatsApp Web holds, loaded when opened */
function NumberLogPanel({ account }: { account: string }) {
  const { data, error, loading, reload } = useApi<NumberLog>(`/whatsapp/${account}/log`, { outreach: true });
  if (loading) return <p className="text-[12px] text-muted">Loading…</p>;
  if (error || !data) return <LoadError message={error ?? "Try again."} onRetry={reload} />;
  const messages = data.messages;
  return (
    <div className="flex flex-col gap-3 pt-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-semibold text-muted">Latest messages on WhatsApp</span>
        <Button size="sm" variant="ghost" onClick={reload}>
          <RotateCcw />
          Refresh
        </Button>
      </div>
      {messages === null ? <p className="text-[12px] text-muted">Shown when it's connected.</p> : null}
      {messages && "error" in messages ? <p className="text-[12px] text-warning">{messages.error}</p> : null}
      {Array.isArray(messages) ? (
        messages.length === 0 ? (
          <p className="text-[12px] text-muted">None loaded yet.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-[12px]">
            {messages.map((message, index) => (
              <li key={index} className="flex flex-col rounded-lg bg-surface-2 px-2.5 py-1.5">
                <span className="text-muted-2">
                  {message.fromMe ? "Sent to" : "From"} {message.chat} · {message.type} · {formatShortWhen(message.at)}
                </span>
                <span className="line-clamp-2 text-ink">{message.body || "(no text)"}</span>
              </li>
            ))}
          </ul>
        )
      ) : null}
      <span className="text-[12px] font-semibold text-muted">Log</span>
      {data.log.length === 0 ? <p className="text-[12px] text-muted">Nothing since the last deploy.</p> : null}
      <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto font-mono text-[11.5px]">
        {data.log.map((line, index) => (
          <li key={index} className={line.error ? "text-danger" : "text-muted"}>
            <span className="text-muted-2">{formatShortWhen(line.at)}</span> {line.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

type LogItem = { id: string; phone: string | null; account: string; body: string; status?: string; error?: string | null; createdAt: string; contactId: string | null };

const STATES: Record<ConnectionState, { label: string; badge: "neutral" | "brand" | "success" | "purple" | "warning" | "danger" }> = {
  disabled: { label: "Switched off", badge: "neutral" },
  starting: { label: "Starting", badge: "brand" },
  qr: { label: "Scan the QR code", badge: "purple" },
  authenticated: { label: "Loading chats", badge: "brand" },
  ready: { label: "Connected", badge: "success" },
  disconnected: { label: "Disconnected", badge: "warning" },
  failed: { label: "Failed", badge: "danger" },
  stopped: { label: "Logged out", badge: "neutral" },
};

function NumberCard({ status, onChanged }: { status: NumberStatus; onChanged: () => void }) {
  const state = STATES[status.state];
  const usage = status.usage;
  const [busy, setBusy] = useState(false);
  // Restart and Link again also cancel a start that's hung
  const canRestart = ["failed", "disconnected", "starting", "authenticated", "qr"].includes(status.state);

  async function restart(relink: boolean) {
    if (relink && !window.confirm(`Forget ${status.account}'s saved login and show a new QR code to scan?`)) return;
    setBusy(true);
    const result = await outreachApi(`/whatsapp/${status.account}/restart`, { method: "POST", json: { relink } });
    setBusy(false);
    if (result.error !== undefined) return toast.error(result.error);
    toast.success(relink ? "Starting with a new QR code: it shows here in a moment" : "Starting again from its saved login");
    onChanged();
  }

  async function logOut() {
    if (!window.confirm(`Log ${status.account} out and delete its saved login? It stays off until you press Link again and scan a new QR code.`)) return;
    setBusy(true);
    const result = await outreachApi(`/whatsapp/${status.account}/logout`, { method: "POST" });
    setBusy(false);
    if (result.error !== undefined) return toast.error(result.error);
    toast.success(`${status.account} is logged out and its login deleted`);
    onChanged();
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-success-wash text-success">
            <Smartphone className="size-[18px]" />
          </span>
          <span className="flex flex-col">
            <span className="text-[14.5px] font-semibold">{status.pushName ?? status.account}</span>
            <span className="text-[12.5px] text-muted">{status.number ? formatPhone(status.number) : `Number ${status.account}`}</span>
          </span>
        </span>
        <Badge variant={state.badge}>{state.label}</Badge>
      </div>
      {status.state === "qr" && status.qrDataUrl ? (
        <div className="flex flex-col items-center gap-2 rounded-[14px] bg-surface-2 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- a data-URL QR from the server */}
          <img src={status.qrDataUrl} alt={`Pairing QR code for ${status.account}`} className="size-56 rounded-lg bg-white p-2" />
          <p className="text-center text-[12.5px] text-muted">On the phone: WhatsApp → Settings → Linked devices → Link a device, then scan.</p>
        </div>
      ) : null}
      {status.lastError && status.state !== "ready" ? <p className="text-[12.5px] text-danger">{status.lastError}</p> : null}
      {status.state === "failed" && status.retryAt ? <p className="text-[12px] text-muted">Trying again by itself {formatShortWhen(status.retryAt)}</p> : null}
      {usage ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[12.5px] text-muted">
            <span>Sent in the last 24 hours</span>
            <span className="font-semibold text-ink tabular-nums">
              {usage.sent} of {usage.limit}
            </span>
          </div>
          <Progress value={(usage.sent / usage.limit) * 100} />
          {usage.remaining === 0 && usage.resetsAt ? <span className="text-[12px] text-warning">At its limit until {formatWhen(usage.resetsAt)}</span> : null}
        </div>
      ) : null}
      {status.state === "ready" ? (
        <>
          <p className="text-[12px] text-muted-2">{status.lastCheckedAt ? `WhatsApp confirmed it's connected ${formatShortWhen(status.lastCheckedAt)}` : "Not checked yet: it's checked every 2 minutes and before each send"}</p>
          <p className="text-[12px] text-muted-2">
            {status.lastSyncedAt
              ? `Chats read for replies ${formatShortWhen(status.lastSyncedAt)}${status.lastSyncFound ? `: ${status.lastSyncFound} new` : ""}`
              : "Chats not read for replies yet: the first read, half a minute after connecting, looks back 14 days"}
          </p>
          {status.lastSyncError ? <p className="text-[12px] text-warning">Reading the chats: {status.lastSyncError}</p> : null}
          {status.lastInboundAt ? <p className="text-[12px] text-muted-2">Last message from someone {formatShortWhen(status.lastInboundAt)}</p> : null}
        </>
      ) : null}
      {status.lastInboundError ? <p className="text-[12px] text-danger">A message couldn't be saved: {status.lastInboundError}</p> : null}
      {status.state !== "disabled" ? (
        <div className="flex flex-wrap gap-2">
          {canRestart ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => restart(false)}>
              <RotateCcw />
              Restart
            </Button>
          ) : null}
          {canRestart || status.state === "stopped" ? (
            <Button size="sm" variant={status.state === "stopped" ? "outline" : "ghost"} disabled={busy} onClick={() => restart(true)}>
              <QrCode />
              Link again
            </Button>
          ) : null}
          {status.state !== "stopped" ? (
            <Button size="sm" variant="ghost" disabled={busy} onClick={logOut} className="text-danger hover:text-danger">
              <LogOut />
              Log out
            </Button>
          ) : null}
        </div>
      ) : null}
      <Collapsible>
        <CollapsibleTrigger className="group flex items-center gap-1 text-[12px] font-semibold text-muted hover:text-ink">
          <ChevronDown className="size-3.5 transition-transform group-data-[panel-open]:rotate-180 motion-reduce:transition-none" />
          Log and latest messages
        </CollapsibleTrigger>
        <CollapsibleContent>
          <NumberLogPanel account={status.account} />
        </CollapsibleContent>
      </Collapsible>
      <p className="text-[12px] text-muted-2">{status.state === "stopped" ? "Logged out: press Link again to scan a new QR code" : status.lastSavedAt ? `Login saved ${formatShortWhen(status.lastSavedAt)}: a redeploy won't need a new scan` : "Login not saved yet: it saves about a minute after connecting"}</p>
    </Card>
  );
}

function Log({ kind }: { kind: "messages" | "replies" }) {
  const { data, error, loading, reload } = useApi<{ total: number; items: LogItem[] }>(`/${kind}?pageSize=50`, { outreach: true });
  if (loading) return <LoadingCards rows={1} />;
  if (error || !data) return <LoadError message={error ?? "Try again."} onRetry={reload} />;
  return (
    <Panel title={kind === "messages" ? `Sent (${data.total})` : `Replies (${data.total})`}>
      {data.items.length === 0 ? <p className="text-[13.5px] text-muted">Nothing yet.</p> : null}
      <ul className="flex flex-col divide-y divide-line-3">
        {data.items.map((item) => (
          <li key={item.id} className="flex flex-col gap-1 py-2.5 text-[13.5px]">
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">
                {item.phone ? formatPhone(item.phone) : "Hidden number"}
                {item.contactId ? (
                  <Link href={`/leads/${item.contactId}`} className="ml-2 text-[12.5px] font-semibold text-brand hover:text-brand-dark">
                    Lead
                  </Link>
                ) : null}
              </span>
              <span className="flex items-center gap-2 text-[12px] text-muted">
                {item.status ? <Badge variant={item.status === "SENT" ? "success" : item.status === "FAILED" ? "danger" : "warning"}>{item.status.toLowerCase().replace(/_/g, " ")}</Badge> : null}
                {kind === "messages" ? `from ${item.account}` : `to ${item.account}`} · {formatShortWhen(item.createdAt)}
              </span>
            </span>
            <p className="line-clamp-3 whitespace-pre-line text-muted">{item.body || "(a photo or voice note)"}</p>
            {item.error ? <p className="text-[12px] text-danger">{item.error}</p> : null}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** The numbers we send from: connect them, watch their limits, and see what went out and came back. */
export default function WhatsAppPage() {
  const { data, error, loading, reload } = useApi<NumberStatus[]>("/whatsapp/status", { outreach: true });
  const [tab, setTab] = useState<"messages" | "replies">("replies");
  const waiting = data?.some((status) => status.state !== "ready" && status.state !== "disabled" && status.state !== "stopped" && (status.state !== "failed" || Boolean(status.retryAt)));

  // Every 5 seconds while a number is starting or waiting for its QR scan
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(reload, 5000);
    return () => clearInterval(timer);
  }, [reload, waiting]);

  return (
    <Page>
      <PageHeader title="WhatsApp" description="The numbers outreach sends from, in turn. Each has its own daily limit; replies and opt-outs are recorded on the lead." />
      {loading ? <LoadingCards /> : null}
      {error ? <LoadError message={error} onRetry={reload} /> : null}
      <PageSection>
        <AgentControl />
      </PageSection>
      {data ? (
        <PageSection className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.map((status) => (
            <NumberCard key={status.account} status={status} onChanged={reload} />
          ))}
        </PageSection>
      ) : null}
      <PageSection>
        <Tabs value={tab} onValueChange={(value) => setTab(value as "messages" | "replies")}>
          <TabsList aria-label="Log">
            <TabsTab value="replies">Replies</TabsTab>
            <TabsTab value="messages">Sent</TabsTab>
          </TabsList>
        </Tabs>
      </PageSection>
      <PageSection>
        <Log key={tab} kind={tab} />
      </PageSection>
    </Page>
  );
}
