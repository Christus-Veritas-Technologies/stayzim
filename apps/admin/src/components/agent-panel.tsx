"use client";

import { Badge } from "@stayzim/ui/components/badge";
import { Button } from "@stayzim/ui/components/button";
import { Bot, Hand, Play, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Panel } from "@/components/page";
import { outreachApi } from "@/lib/api";
import { formatShortWhen } from "@/lib/format";
import { AGENT_STAGES } from "@/lib/labels";
import type { AgentStage } from "@/lib/types";
import { useApi } from "@/lib/use-api";

type AgentEventRow = { id: string; kind: string; data: Record<string, unknown>; costUsd: number; createdAt: string };

type AgentLead = {
  stage: AgentStage;
  paused: boolean;
  account: string | null;
  qualification: { jev?: { placeToStay: number; intent: string; fit: string; needsHuman: number; photosOfProperty?: number }; facts?: { kind?: string; rooms?: number } } | null;
  disqualifiedReason: string | null;
  nextFollowUpAt: string | null;
  followUps: number;
  cost: number;
  events: AgentEventRow[];
};

const percent = (value: number) => `${Math.round(value * 100)}%`;
const dollars = (value: number) => `$${value < 0.01 && value > 0 ? value.toFixed(4) : value.toFixed(2)}`;

/** One line about what the agent did, for the log. */
export function describeEvent(event: { kind: string; data: Record<string, unknown> }) {
  const data = event.data as Record<string, any>;
  switch (event.kind) {
    case "decision":
      return `${data.mode === "shadow" ? "Shadow · " : ""}${data.decision?.action}: ${data.decision?.reason}`;
    case "reply":
      return String(data.text ?? "");
    case "tool":
      return `${String(data.tool).replace(/_/g, " ")}${data.sites ? `: ${(data.sites as string[]).join(", ")}` : data.reason ? `: ${data.reason}` : ""}`;
    case "payment":
      return `EcoCash prompt for $${((data.amountCents ?? 0) / 100).toFixed(2)} to ${data.phone}`;
    case "paid":
      return `Paid $${((data.amountCents ?? 0) / 100).toFixed(2)} (${data.receipt ?? "receipt pending"})`;
    case "follow_up":
      return `Follow-up ${data.n} sent`;
    case "turn":
      return data.silent ? `Stayed silent (${data.silent})` : data.replied ? `Replied${data.tools?.length ? ` after ${(data.tools as string[]).join(", ")}` : ""}` : "No reply";
    case "command":
      return `Kin typed /${data.command}${data.command === "silence" ? ": the agent is quiet here" : data.command === "ban" ? ": never answered again" : ": the agent carries on"}`;
    case "kin_reply":
      return `Kin replied from the phone: ${data.text}`;
    case "alert":
      return `Alert to Kin: ${data.text}`;
    case "error":
      return `Problem: ${data.error ?? data.alert ?? ""}`;
    default:
      return event.kind;
  }
}

const KIND_BADGE: Record<string, "neutral" | "brand" | "success" | "purple" | "warning" | "danger"> = {
  decision: "purple",
  reply: "brand",
  tool: "neutral",
  payment: "warning",
  paid: "success",
  follow_up: "neutral",
  turn: "neutral",
  alert: "warning",
  command: "danger",
  kin_reply: "brand",
  error: "danger",
};

/** The WhatsApp sales agent with this lead: where it is, what it thinks, what it did, what it cost. */
export function AgentPanel({ leadId, onChanged }: { leadId: string; onChanged: () => void }) {
  const { data, reload } = useApi<AgentLead>(`/agent/leads/${leadId}`, { outreach: true });
  const [busy, setBusy] = useState(false);
  if (!data) return null;
  const q = data.qualification?.jev;
  const stage = AGENT_STAGES[data.stage];
  const untouched = data.stage === "NEW" && data.events.length === 0;

  async function act(action: "take-over" | "resume" | "reply-anyway", done: string) {
    setBusy(true);
    const result = await outreachApi(`/agent/leads/${leadId}/${action}`, { method: "POST" });
    setBusy(false);
    if (result.error !== undefined) return toast.error(result.error);
    toast.success(done);
    reload();
    onChanged();
  }

  return (
    <Panel
      title="Sales agent"
      description={untouched ? "The agent hasn't talked to them yet. It answers people who message its number." : `On ${data.account ?? "its number"} · ${dollars(data.cost)} so far`}
      actions={
        <span className="flex flex-wrap gap-2">
          {data.stage === "DISQUALIFIED" ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => act("reply-anyway", "The agent will reply to them")}>
              <RotateCcw />
              Reply anyway
            </Button>
          ) : data.paused || data.stage === "HANDOVER" ? (
            <Button size="sm" disabled={busy} onClick={() => act("resume", "The agent carries on with them")}>
              <Play />
              Resume agent
            </Button>
          ) : !untouched && data.stage !== "PAID" ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => act("take-over", "You have this chat: the agent stays quiet")}>
              <Hand />
              Take over
            </Button>
          ) : null}
        </span>
      }
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={data.paused ? "danger" : stage.badge}>
          <Bot className="size-3.5" />
          {data.paused ? "You have this chat" : stage.label}
        </Badge>
        {data.disqualifiedReason ? <Badge variant="neutral">{data.disqualifiedReason}</Badge> : null}
        {data.nextFollowUpAt ? <Badge variant="neutral">Follow-up {data.followUps + 1} {formatShortWhen(data.nextFollowUpAt)}</Badge> : null}
      </div>
      {q ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-[14px] bg-surface-2 p-3 text-[12.5px]">
          <dt className="text-muted">A place to stay</dt>
          <dd className="text-right font-semibold tabular-nums">{percent(q.placeToStay)}</dd>
          <dt className="text-muted">Wants</dt>
          <dd className="text-right font-semibold">{q.intent}</dd>
          <dt className="text-muted">How established</dt>
          <dd className="text-right font-semibold">{q.fit}</dd>
          {q.photosOfProperty !== undefined ? (
            <>
              <dt className="text-muted">Photos of the property</dt>
              <dd className="text-right font-semibold tabular-nums">{percent(q.photosOfProperty)}</dd>
            </>
          ) : null}
          <dt className="text-muted">Needs a person</dt>
          <dd className="text-right font-semibold tabular-nums">{percent(q.needsHuman)}</dd>
        </dl>
      ) : null}
      {data.events.length > 0 ? (
        <ol className="flex max-h-[360px] flex-col gap-2 overflow-y-auto">
          {data.events.map((event) => (
            <li key={event.id} className="flex flex-col gap-0.5 border-b border-line-3 pb-2 text-[12.5px] last:border-b-0">
              <span className="flex items-center justify-between gap-2">
                <Badge variant={KIND_BADGE[event.kind] ?? "neutral"}>{event.kind.replace("_", " ")}</Badge>
                <span className="text-muted-2 tabular-nums">
                  {formatShortWhen(event.createdAt)}
                  {event.costUsd > 0 ? ` · ${dollars(event.costUsd)}` : ""}
                </span>
              </span>
              <span className="whitespace-pre-line text-ink-2">{describeEvent(event)}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </Panel>
  );
}
