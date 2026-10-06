"use client";

import { Badge } from "@stayzim/ui/components/badge";
import { Button, buttonVariants } from "@stayzim/ui/components/button";
import { Card } from "@stayzim/ui/components/card";
import { EmptyState } from "@stayzim/ui/components/empty-state";
import { Field } from "@stayzim/ui/components/field";
import { Skeleton } from "@stayzim/ui/components/skeleton";
import { Tabs, TabsList, TabsTab } from "@stayzim/ui/components/tabs";
import { Textarea } from "@stayzim/ui/components/textarea";
import { Toggle, ToggleGroup } from "@stayzim/ui/components/toggle";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, CircleCheck, Info, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { WhatsAppIcon } from "@/components/landing/brand";
import { Appear, Item, riseIn } from "@/components/motion";
import { WhyDisabled } from "@/components/why-disabled";
import { api } from "@/lib/api";
import { formatWhen } from "@/lib/format";
import { siteHost, siteUrl } from "@/lib/lodge";
import { OFFLINE_REASON, useOnline } from "@/lib/online";
import { REQUEST_STATUSES, REQUEST_TOPICS, type ChangeRequest, type RequestStatus } from "@/lib/requests";
import { whatsappTextUrl } from "@/lib/whatsapp";

/** GET /api/admin/requests (apps/server/src/routes/admin.ts) */
type AdminRequest = ChangeRequest & {
  lodge: { name: string; slug: string; whatsapp: string | null; ownerName: string; ownerEmail: string };
};

type Filter = "open" | "done" | "all";

const STATUS_ORDER: RequestStatus[] = ["OPEN", "IN_PROGRESS", "DONE", "DECLINED"];

export default function AdminRequestsPage() {
  const [filter, setFilter] = useState<Filter>("open");
  const [state, setState] = useState<
    { kind: "loading" } | { kind: "ready"; requests: AdminRequest[]; counts: { open: number; inProgress: number } } | { kind: "error"; message: string }
  >({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    setState({ kind: "loading" });
    void api<{ requests: AdminRequest[]; counts: { open: number; inProgress: number } }>(`/api/admin/requests?status=${filter}`).then((result) => {
      if (!current) return;
      setState(result.error === undefined ? { kind: "ready", ...result.data } : { kind: "error", message: result.error });
    });
    return () => {
      current = false;
    };
  }, [filter, attempt]);

  function onUpdated(updated: AdminRequest, previous: RequestStatus) {
    setState((current) => {
      if (current.kind !== "ready") return current;
      const stillShown =
        filter === "all" || (filter === "open" ? ["OPEN", "IN_PROGRESS"] : ["DONE", "DECLINED"]).includes(updated.status);
      const counts = { ...current.counts };
      if (previous === "OPEN") counts.open--;
      if (previous === "IN_PROGRESS") counts.inProgress--;
      if (updated.status === "OPEN") counts.open++;
      if (updated.status === "IN_PROGRESS") counts.inProgress++;
      return {
        kind: "ready",
        counts,
        requests: stillShown
          ? current.requests.map((request) => (request.id === updated.id ? updated : request))
          : current.requests.filter((request) => request.id !== updated.id),
      };
    });
  }

  const waiting = state.kind === "ready" ? state.counts.open + state.counts.inProgress : null;

  return (
    <Appear className="flex flex-col gap-5" stagger={0.06}>
      <Item variants={riseIn} className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl leading-8 font-semibold tracking-[-0.02em] lg:text-[28px] lg:leading-[34px]">Change requests</h1>
          <p className="text-[13.5px] text-muted">
            What owners asked for. Your reply shows under their request in the dashboard.
            {state.kind === "ready" ? (
              <>
                {" "}
                <strong className="font-semibold text-ink">{state.counts.open}</strong> open,{" "}
                <strong className="font-semibold text-ink">{state.counts.inProgress}</strong> in progress.
              </>
            ) : null}
          </p>
        </div>
        <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
          <TabsList aria-label="Show">
            <TabsTab value="open">
              Waiting
              {waiting ? (
                <Badge variant={filter === "open" ? "inverse" : "purple"} className="h-5 px-1.5">
                  {waiting}
                </Badge>
              ) : null}
            </TabsTab>
            <TabsTab value="done">Done</TabsTab>
            <TabsTab value="all">All</TabsTab>
          </TabsList>
        </Tabs>
      </Item>

      <Item variants={riseIn}>
        {state.kind === "loading" ? (
          <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading requests">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-[180px] rounded-[20px] bg-white" />
            ))}
          </div>
        ) : state.kind === "error" ? (
          <Card>
            <EmptyState
              icon={<Info />}
              title="Requests didn't load"
              description={state.message}
              action={
                <Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>
                  <RotateCcw />
                  Try again
                </Button>
              }
            />
          </Card>
        ) : state.requests.length === 0 ? (
          <Card>
            <EmptyState
              icon={<CircleCheck />}
              title={filter === "open" ? "Nothing waiting" : "No requests here yet"}
              description={filter === "open" ? "Every request has an answer. New ones show here first." : undefined}
            />
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {state.requests.map((request) => (
                <RequestCard key={request.id} request={request} onUpdated={onUpdated} />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Item>
    </Appear>
  );
}

function RequestCard({ request, onUpdated }: { request: AdminRequest; onUpdated: (updated: AdminRequest, previous: RequestStatus) => void }) {
  const online = useOnline();
  const [status, setStatus] = useState<RequestStatus>(request.status);
  const [reply, setReply] = useState(request.reply ?? "");
  const [saving, setSaving] = useState(false);
  const topic = REQUEST_TOPICS[request.topic];
  const TopicIcon = topic.icon;
  const changed = status !== request.status || reply.trim() !== (request.reply ?? "");
  const ownerFirstName = request.lodge.ownerName.split(" ")[0] ?? request.lodge.ownerName;

  async function onSave() {
    setSaving(true);
    const result = await api<AdminRequest>(`/api/admin/requests/${request.id}`, { method: "PATCH", json: { status, reply: reply.trim() } });
    setSaving(false);
    if (result.error !== undefined) {
      toast.error(result.error);
      return;
    }
    onUpdated(result.data, request.status);
    toast.success(`${request.reference} is ${REQUEST_STATUSES[result.data.status].label.toLowerCase()}`, {
      description: result.data.reply ? `${request.lodge.name} sees your reply in their dashboard.` : undefined,
    });
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 24, transition: { duration: 0.25 } }}
      transition={{ type: "spring", stiffness: 380, damping: 34 }}
    >
      <Card className="gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
              <span className="font-mono text-[12.5px] font-semibold text-ink">{request.reference}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <TopicIcon className="size-3.5" />
                {topic.label}
              </span>
              <span aria-hidden="true">·</span>
              <span>{formatWhen(request.createdAt)}</span>
            </span>
            <span className="flex flex-wrap items-center gap-x-2 text-[14px]">
              <strong className="font-semibold">{request.lodge.name}</strong>
              <span className="text-[13px] text-muted">
                {request.lodge.ownerName} · {request.lodge.ownerEmail}
              </span>
            </span>
          </div>
          <Badge variant={REQUEST_STATUSES[request.status].badge} status>
            {REQUEST_STATUSES[request.status].label}
          </Badge>
        </div>

        <p className="rounded-[14px] bg-surface px-4 py-3 text-[14px] leading-[21px] whitespace-pre-line text-ink-2">{request.message}</p>

        <div className="flex flex-wrap gap-2">
          <a href={siteUrl(request.lodge)} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
            {siteHost(request.lodge)}
            <ArrowUpRight />
          </a>
          {request.lodge.whatsapp ? (
            <a
              href={whatsappTextUrl(`Hi ${ownerFirstName}, about your change request ${request.reference}: `, request.lodge.whatsapp)}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "whatsapp", size: "sm" })}
            >
              <WhatsAppIcon size={14} />
              Message {ownerFirstName}
            </a>
          ) : null}
        </div>

        <fieldset disabled={saving} className="flex min-w-0 flex-col gap-3 border-t border-line-3 pt-4">
          <Field label="Status">
            <ToggleGroup
              value={[status]}
              onValueChange={(value) => {
                const next = value[0] as RequestStatus | undefined;
                if (next) setStatus(next);
              }}
              aria-label="Status"
            >
              {STATUS_ORDER.map((key) => (
                <Toggle key={key} value={key}>
                  {REQUEST_STATUSES[key].label}
                </Toggle>
              ))}
            </ToggleGroup>
          </Field>
          <Field label="Reply to the owner" count={{ value: reply.length, max: 1000 }}>
            <Textarea
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              maxLength={1000}
              placeholder="What you changed, or why not. The owner sees this under their request."
              className="min-h-20"
            />
          </Field>
          <div className="flex justify-end">
            <WhyDisabled reason={saving ? null : !online ? OFFLINE_REASON : changed ? null : "No changes to save"}>
              <Button onClick={onSave} loading={saving} disabled={!changed || !online}>
                Save
              </Button>
            </WhyDisabled>
          </div>
        </fieldset>
      </Card>
    </motion.li>
  );
}
