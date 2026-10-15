"use client";

import { Badge } from "@stayzim/ui/components/badge";
import { Card } from "@stayzim/ui/components/card";
import { Progress } from "@stayzim/ui/components/progress";
import { Tabs, TabsList, TabsTab } from "@stayzim/ui/components/tabs";
import { Smartphone } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { AgentControl } from "@/components/agent-control";
import { LoadError, LoadingCards, Page, PageHeader, PageSection, Panel } from "@/components/page";
import { formatShortWhen, formatWhen } from "@/lib/format";
import { formatPhone } from "@/lib/labels";
import { useApi } from "@/lib/use-api";

type ConnectionState = "disabled" | "starting" | "qr" | "authenticated" | "ready" | "disconnected" | "failed";

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
  startedAt: string;
  usage?: { sent: number; limit: number; remaining: number; resetsAt?: string };
};

type LogItem = { id: string; phone: string | null; account: string; body: string; status?: string; error?: string | null; createdAt: string; contactId: string | null };

const STATES: Record<ConnectionState, { label: string; badge: "neutral" | "brand" | "success" | "purple" | "warning" | "danger" }> = {
  disabled: { label: "Switched off", badge: "neutral" },
  starting: { label: "Starting", badge: "brand" },
  qr: { label: "Scan the QR code", badge: "purple" },
  authenticated: { label: "Loading chats", badge: "brand" },
  ready: { label: "Connected", badge: "success" },
  disconnected: { label: "Disconnected", badge: "warning" },
  failed: { label: "Failed", badge: "danger" },
};

function NumberCard({ status }: { status: NumberStatus }) {
  const state = STATES[status.state];
  const usage = status.usage;
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
        </>
      ) : null}
      <p className="text-[12px] text-muted-2">{status.lastSavedAt ? `Login saved ${formatShortWhen(status.lastSavedAt)}: a redeploy won't need a new scan` : "Login not saved yet: it saves about a minute after connecting"}</p>
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
  const waiting = data?.some((status) => status.state !== "ready" && status.state !== "disabled" && status.state !== "failed");

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
            <NumberCard key={status.account} status={status} />
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
