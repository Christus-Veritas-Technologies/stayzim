"use client";

import { Badge } from "@stayzim/ui/components/badge";
import { Button, buttonVariants } from "@stayzim/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@stayzim/ui/components/card";
import { EmptyState } from "@stayzim/ui/components/empty-state";
import { Field, FormMessage } from "@stayzim/ui/components/field";
import { Skeleton } from "@stayzim/ui/components/skeleton";
import { Textarea } from "@stayzim/ui/components/textarea";
import { Toggle, ToggleGroup } from "@stayzim/ui/components/toggle";
import { AnimatePresence, motion } from "framer-motion";
import { CircleCheck, Info, MessageSquarePlus, Plus, RotateCcw, Send } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { useLodge } from "@/components/dashboard/lodge-provider";
import { Page, PageHeader, PageSection } from "@/components/dashboard/page";
import { WhatsAppIcon } from "@/components/landing/brand";
import { WhyDisabled } from "@/components/why-disabled";
import { api } from "@/lib/api";
import { formatWhen } from "@/lib/format";
import { OFFLINE_REASON, useOnline } from "@/lib/online";
import {
  REQUEST_MESSAGE,
  REQUEST_STATUSES,
  REQUEST_TOPIC_ORDER,
  REQUEST_TOPICS,
  requestChatText,
  type ChangeRequest,
  type RequestTopic,
} from "@/lib/requests";
import { stayzimChatUrl } from "@/lib/whatsapp";

type ListState = { kind: "loading" } | { kind: "ready"; requests: ChangeRequest[] } | { kind: "error"; message: string };

export default function RequestsPage() {
  const [list, setList] = useState<ListState>({ kind: "loading" });

  async function load() {
    setList({ kind: "loading" });
    const result = await api<ChangeRequest[]>("/api/lodge/requests");
    setList(result.error === undefined ? { kind: "ready", requests: result.data } : { kind: "error", message: result.error });
  }

  useEffect(() => {
    void load();
  }, []);

  function onSent(request: ChangeRequest) {
    setList((current) => (current.kind === "ready" ? { kind: "ready", requests: [request, ...current.requests] } : current));
  }

  return (
    <Page className="pb-6">
      <PageHeader
        sitePage
        back={{ label: "My site", href: "/dashboard/site" }}
        title="Change requests"
        description="Anything you can't change yourself, we change for you. We reply here."
      />

      <PageSection className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        <RequestForm onSent={onSent} />
        <RequestList state={list} onRetry={load} />
      </PageSection>
    </Page>
  );
}

function RequestForm({ onSent }: { onSent: (request: ChangeRequest) => void }) {
  const { lodge } = useLodge();
  const online = useOnline();
  const [topic, setTopic] = useState<RequestTopic>("TEXT");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<ChangeRequest | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (message.trim().length < REQUEST_MESSAGE.min) {
      setError(`Tell us a bit more (${REQUEST_MESSAGE.min} characters at least).`);
      return;
    }
    setSending(true);
    setError(null);
    const result = await api<ChangeRequest>("/api/lodge/requests", { method: "POST", json: { topic, message: message.trim() } });
    setSending(false);
    if (result.error !== undefined) {
      setError(result.error);
      return;
    }
    onSent(result.data);
    setSent(result.data);
    setMessage("");
    toast.success(`Request ${result.data.reference} sent`, { description: "We'll reply here when it's done." });
  }

  return (
    <Card className="lg:sticky lg:top-20">
      <AnimatePresence mode="wait" initial={false}>
        {sent ? (
          <motion.div
            key="sent"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center gap-3 px-6 py-9 text-center"
          >
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
              className="flex size-12 items-center justify-center rounded-2xl bg-success-tint text-success"
            >
              <CircleCheck className="size-6" />
            </motion.span>
            <div className="flex flex-col gap-1">
              <p className="text-[15px] font-semibold">Request {sent.reference} sent</p>
              <p className="text-[13.5px] leading-5 text-muted">We&apos;ll reply here. Send it on WhatsApp too if it&apos;s urgent, so we see it sooner.</p>
            </div>
            <div className="mt-1 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
              <a
                href={stayzimChatUrl(requestChatText(sent, lodge.name))}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "whatsapp" })}
              >
                <WhatsAppIcon size={16} />
                Send on WhatsApp
              </a>
              <Button variant="outline" onClick={() => setSent(null)}>
                <Plus />
                New request
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onSubmit={onSubmit}
            noValidate
          >
            <CardHeader>
              <span className="flex size-9 items-center justify-center rounded-[10px] bg-brand-wash text-brand">
                <MessageSquarePlus className="size-[18px]" />
              </span>
              <div className="flex min-w-0 flex-col">
                <CardTitle>New request</CardTitle>
                <CardDescription>Tell us what to change. We usually reply within a day.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <fieldset disabled={sending} className="flex min-w-0 flex-col gap-4">
                <FormMessage>{error}</FormMessage>
                <Field label="About">
                  <ToggleGroup
                    value={[topic]}
                    onValueChange={(value) => {
                      const next = value[0] as RequestTopic | undefined;
                      if (next) setTopic(next);
                    }}
                    aria-label="What the request is about"
                  >
                    {REQUEST_TOPIC_ORDER.map((key) => {
                      const Icon = REQUEST_TOPICS[key].icon;
                      return (
                        <Toggle key={key} value={key}>
                          <Icon className="group-data-pressed/toggle:hidden" />
                          {REQUEST_TOPICS[key].label}
                        </Toggle>
                      );
                    })}
                  </ToggleGroup>
                </Field>
                <Field label="What should we change?" count={{ value: message.length, max: REQUEST_MESSAGE.max }}>
                  <Textarea
                    value={message}
                    onChange={(event) => {
                      setMessage(event.target.value);
                      setError(null);
                    }}
                    maxLength={REQUEST_MESSAGE.max}
                    placeholder={REQUEST_TOPICS[topic].example}
                    className="min-h-32"
                  />
                </Field>
                <WhyDisabled reason={!online && !sending ? OFFLINE_REASON : null}>
                  <Button type="submit" loading={sending} disabled={!online} className="w-full">
                    {sending ? null : <Send />}
                    Send request
                  </Button>
                </WhyDisabled>
              </fieldset>
            </CardContent>
          </motion.form>
        )}
      </AnimatePresence>
    </Card>
  );
}

function RequestList({ state, onRetry }: { state: ListState; onRetry: () => void }) {
  const count = state.kind === "ready" ? state.requests.length : null;
  return (
    <Card className="min-w-0">
      <CardHeader className="border-b border-line-3">
        <CardTitle>
          Your requests
          {count ? <Badge>{count}</Badge> : null}
        </CardTitle>
      </CardHeader>

      {state.kind === "loading" ? (
        <div className="flex flex-col divide-y divide-line-3" aria-busy="true" aria-label="Loading requests">
          {[0, 1, 2].map((index) => (
            <div key={index} className="flex flex-col gap-2.5 px-4 py-4 sm:px-5">
              <div className="flex justify-between gap-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-2/3" />
            </div>
          ))}
        </div>
      ) : state.kind === "error" ? (
        <EmptyState
          icon={<Info />}
          title="Your requests didn't load"
          description={state.message}
          action={
            <Button variant="outline" onClick={onRetry}>
              <RotateCcw />
              Try again
            </Button>
          }
        />
      ) : state.requests.length === 0 ? (
        <EmptyState
          icon={<MessageSquarePlus />}
          title="No requests yet"
          description="New photos, different words, another layout: ask for anything you can't change yourself."
        />
      ) : (
        <ul className="flex flex-col divide-y divide-line-3">
          <AnimatePresence initial={false}>
            {state.requests.map((request) => (
              <RequestItem key={request.id} request={request} />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </Card>
  );
}

function RequestItem({ request }: { request: ChangeRequest }) {
  const topic = REQUEST_TOPICS[request.topic];
  const status = REQUEST_STATUSES[request.status];
  const TopicIcon = topic.icon;
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className="flex flex-col gap-2.5 px-4 py-4 sm:px-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <span className="flex min-w-0 items-center gap-2 text-[13px] text-muted">
          <span className="font-mono text-[12.5px] font-semibold text-ink">{request.reference}</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <TopicIcon className="size-3.5" />
            {topic.label}
          </span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{formatWhen(request.createdAt)}</span>
        </span>
        <Badge variant={status.badge} status>
          {status.label}
        </Badge>
      </div>
      <p className="text-[14px] leading-[21px] whitespace-pre-line text-ink-2">{request.message}</p>
      {request.reply ? (
        <div className="flex gap-2.5 rounded-[14px] bg-surface px-3.5 py-3">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">S</span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-xs font-semibold text-ink">
              StayZim replied
              {request.resolvedAt ? <span className="font-normal text-muted-2"> · {formatWhen(request.resolvedAt)}</span> : null}
            </span>
            <p className="text-[13.5px] leading-5 whitespace-pre-line text-ink-2">{request.reply}</p>
          </div>
        </div>
      ) : null}
    </motion.li>
  );
}
