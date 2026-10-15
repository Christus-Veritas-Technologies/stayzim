"use client";

import { Badge } from "@stayzim/ui/components/badge";
import { cn } from "@stayzim/ui/lib/utils";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { describeEvent } from "@/components/agent-panel";
import { Panel } from "@/components/page";
import { outreachApi } from "@/lib/api";
import { formatShortWhen } from "@/lib/format";
import { AGENT_STAGES } from "@/lib/labels";
import type { AgentStage } from "@/lib/types";
import { useApi } from "@/lib/use-api";

type Mode = "off" | "shadow" | "live";

type AgentOverview = {
  mode: Mode;
  configured: boolean;
  accounts: string[];
  models: { chat: string; fallback: string; decisions: string };
  stages: Partial<Record<AgentStage, number>>;
  cost: { today: number; last30Days: number };
  recent: { id: string; kind: string; data: Record<string, unknown>; costUsd: number; createdAt: string; contact: { id: string; name: string; lodgeName: string | null } | null }[];
};

const MODES: { mode: Mode; label: string; hint: string }[] = [
  { mode: "off", label: "Off", hint: "Nothing happens. Messages are still recorded." },
  { mode: "shadow", label: "Shadow", hint: "Qualifies every message and logs what it would do. Never replies." },
  { mode: "live", label: "Live", hint: "Answers people who message its number, makes their sites, takes EcoCash." },
];

const dollars = (value: number) => `$${value.toFixed(2)}`;

/** The sales agent's switch and what it's been doing, on the WhatsApp page. */
export function AgentControl() {
  const { data, reload } = useApi<AgentOverview>("/agent", { outreach: true });
  const [saving, setSaving] = useState(false);
  if (!data) return null;

  async function setMode(mode: Mode) {
    setSaving(true);
    const result = await outreachApi("/agent/mode", { method: "PUT", json: { mode } });
    setSaving(false);
    if (result.error !== undefined) return toast.error(result.error);
    toast.success(mode === "live" ? "The agent is live: it answers on " + data!.accounts.join(", ") : mode === "shadow" ? "Shadow mode: it qualifies and logs, never replies" : "The agent is off");
    reload();
  }

  const current = MODES.find((m) => m.mode === data.mode)!;
  return (
    <Panel
      title="Sales agent"
      description={`Answers people who message ${data.accounts.join(", ")} from the ads. ${dollars(data.cost.today)} today · ${dollars(data.cost.last30Days)} in 30 days.`}
    >
      {!data.configured ? <p className="rounded-[12px] bg-warning-tint px-3 py-2 text-[13px] text-warning">Set OPENROUTER_API_KEY on the admin app to switch it on.</p> : null}
      <div role="radiogroup" aria-label="Agent mode" className="grid grid-cols-3 gap-2">
        {MODES.map((option) => (
          <button
            key={option.mode}
            type="button"
            role="radio"
            aria-checked={data.mode === option.mode}
            disabled={saving || (!data.configured && option.mode !== "off")}
            onClick={() => setMode(option.mode)}
            className={cn(
              "rounded-xl border px-3 py-2 text-[13.5px] font-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-50",
              data.mode === option.mode
                ? option.mode === "live"
                  ? "border-success bg-success-wash text-success"
                  : "border-brand bg-brand-wash shadow-[0_0_0_1px_var(--color-brand)]"
                : "border-input hover:border-[#cfd8dd]",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="text-[12.5px] text-muted">{current.hint}</p>
      {Object.keys(data.stages).length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(data.stages) as AgentStage[]).map((stage) => (
            <Badge key={stage} variant={AGENT_STAGES[stage].badge}>
              {AGENT_STAGES[stage].label}: {data.stages[stage]}
            </Badge>
          ))}
        </div>
      ) : null}
      <p className="text-[12px] text-muted-2">
        Talks with {data.models.chat} (fallback {data.models.fallback}); qualifies with {data.models.decisions}.
      </p>
      {data.recent.length > 0 ? (
        <ol className="flex max-h-[320px] flex-col gap-2 overflow-y-auto border-t border-line-3 pt-3">
          {data.recent.map((event) => (
            <li key={event.id} className="flex flex-col gap-0.5 text-[12.5px]">
              <span className="flex items-center justify-between gap-2">
                {event.contact ? (
                  <Link href={`/leads/${event.contact.id}`} className="truncate font-semibold text-ink no-underline hover:text-brand">
                    {event.contact.lodgeName ?? event.contact.name}
                  </Link>
                ) : (
                  <span className="font-semibold">Kin</span>
                )}
                <span className="shrink-0 text-muted-2">{formatShortWhen(event.createdAt)}</span>
              </span>
              <span className="line-clamp-2 text-muted">{describeEvent(event)}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </Panel>
  );
}
