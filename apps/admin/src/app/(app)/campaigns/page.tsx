"use client";

import { Badge } from "@stayzim/ui/components/badge";
import { Button } from "@stayzim/ui/components/button";
import { Field, FormMessage } from "@stayzim/ui/components/field";
import { Input } from "@stayzim/ui/components/input";
import { Progress } from "@stayzim/ui/components/progress";
import { Switch } from "@stayzim/ui/components/switch";
import { Textarea } from "@stayzim/ui/components/textarea";
import { Megaphone, Square } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Page, PageHeader, PageSection, Panel } from "@/components/page";
import { outreachApi } from "@/lib/api";
import { formatWhen } from "@/lib/format";
import { useApi } from "@/lib/use-api";

type CampaignState = {
  running: boolean;
  stopRequested: boolean;
  message: string;
  startedAt: string;
  finishedAt?: string;
  stoppedReason?: string;
  total: number;
  processed: number;
  sent: number;
  notOnWhatsapp: number;
  failed: number;
  skipped: number;
  nextSendAt?: string;
  pausedUntil?: string;
};

function Current({ campaign, onStopped }: { campaign: CampaignState; onStopped: () => void }) {
  async function stop() {
    const result = await outreachApi("/campaigns/current/stop", { method: "POST" });
    if (result.error !== undefined) toast.error(result.error);
    else {
      toast.success("Stopping before the next message");
      onStopped();
    }
  }
  return (
    <Panel
      title={campaign.running ? "Sending now" : "Last campaign"}
      description={`Started ${formatWhen(campaign.startedAt)}${campaign.finishedAt ? ` · finished ${formatWhen(campaign.finishedAt)}` : ""}`}
      actions={
        campaign.running ? (
          <Button variant="outline" size="sm" onClick={stop} disabled={campaign.stopRequested}>
            <Square />
            {campaign.stopRequested ? "Stopping" : "Stop"}
          </Button>
        ) : null
      }
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-[13px] text-muted">
          <span>
            {campaign.processed} of {campaign.total} done
          </span>
          {campaign.pausedUntil ? <span className="text-warning">Every number is at its daily limit: waiting until {formatWhen(campaign.pausedUntil)}</span> : null}
          {campaign.nextSendAt && !campaign.pausedUntil ? <span>Next at {formatWhen(campaign.nextSendAt)}</span> : null}
        </div>
        <Progress value={campaign.total ? (campaign.processed / campaign.total) * 100 : 0} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="success">{campaign.sent} sent</Badge>
        <Badge variant="warning">{campaign.notOnWhatsapp} not on WhatsApp</Badge>
        <Badge variant="danger">{campaign.failed} failed</Badge>
        <Badge variant="neutral">{campaign.skipped} skipped</Badge>
      </div>
      {campaign.stoppedReason ? <p className="text-[13px] text-muted">Stopped: {campaign.stoppedReason}</p> : null}
      <p className="rounded-[12px] bg-surface-2 px-3 py-2 text-[13px] whitespace-pre-line text-muted">{campaign.message}</p>
    </Panel>
  );
}

/**
 * One message to many leads, sent one at a time with a random gap, rotating
 * across the connected numbers within their daily limits.
 */
export default function CampaignsPage() {
  const { data: campaign, reload } = useApi<CampaignState | null>("/campaigns/current", { outreach: true });
  const [message, setMessage] = useState("");
  const [city, setCity] = useState("");
  const [phones, setPhones] = useState("");
  const [limit, setLimit] = useState("");
  const [followUp, setFollowUp] = useState(false);
  const [retryFailed, setRetryFailed] = useState(false);
  const [minDelay, setMinDelay] = useState("35");
  const [maxDelay, setMaxDelay] = useState("75");
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!campaign?.running) return;
    const timer = setInterval(reload, 5000);
    return () => clearInterval(timer);
  }, [campaign?.running, reload]);

  const phoneList = phones
    .split(/[\n,;]+/)
    .map((value) => value.trim())
    .filter(Boolean);

  async function start(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (followUp && phoneList.length === 0) {
      setError("A follow-up goes to the numbers you list. Add them below.");
      return;
    }
    setStarting(true);
    const result = await outreachApi<CampaignState>("/campaigns", {
      method: "POST",
      json: {
        message,
        ...(city.trim() ? { city: city.trim() } : {}),
        ...(phoneList.length ? { phones: phoneList } : {}),
        ...(limit ? { limit: Number(limit) } : {}),
        followUp,
        retryFailed,
        minDelaySeconds: Number(minDelay) || 35,
        maxDelaySeconds: Number(maxDelay) || 75,
      },
    });
    setStarting(false);
    if (result.error !== undefined) {
      setError(result.error);
      return;
    }
    toast.success(`Sending to ${result.data.total} ${result.data.total === 1 ? "lead" : "leads"}`);
    reload();
  }

  return (
    <Page>
      <PageHeader title="Campaigns" description="One message to many leads, one at a time with a random gap, rotating across the connected numbers." />
      {campaign ? (
        <PageSection>
          <Current campaign={campaign} onStopped={reload} />
        </PageSection>
      ) : null}
      <PageSection>
        <Panel title="New campaign" description="Goes to leads not messaged yet, unless it's a follow-up. Opt-outs and numbers not on WhatsApp never get anything.">
          <form onSubmit={start} className="flex flex-col gap-4">
            <Field label="Message" hint="{name} and {city} are filled in from each lead." count={{ value: message.length, max: 4096 }}>
              <Textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={7} maxLength={4096} required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Only leads in this town" hint="Leave empty for every town.">
                <Input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Harare" />
              </Field>
              <Field label="At most" hint="How many leads, at most.">
                <Input inputMode="numeric" value={limit} onChange={(event) => setLimit(event.target.value.replace(/\D/g, ""))} placeholder="Everyone who matches" />
              </Field>
            </div>
            <Field label="Only these numbers" hint="One per line, with the country code. They must be leads already.">
              <Textarea value={phones} onChange={(event) => setPhones(event.target.value)} rows={3} placeholder="+263 77 123 4567" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Gap between messages (seconds)" hint="A random wait in this range, so it doesn't look automated.">
                <span className="flex items-center gap-2">
                  <Input inputMode="numeric" value={minDelay} onChange={(event) => setMinDelay(event.target.value.replace(/\D/g, ""))} aria-label="Shortest gap" />
                  <span className="text-muted">to</span>
                  <Input inputMode="numeric" value={maxDelay} onChange={(event) => setMaxDelay(event.target.value.replace(/\D/g, ""))} aria-label="Longest gap" />
                </span>
              </Field>
              <div className="flex flex-col gap-3 pt-1">
                <label className="flex items-center justify-between gap-3 text-[13.5px]">
                  <span className="flex flex-col">
                    Follow-up
                    <span className="text-[12.5px] text-muted">Also leads already messaged or who replied (the numbers listed only)</span>
                  </span>
                  <Switch checked={followUp} onCheckedChange={setFollowUp} />
                </label>
                <label className="flex items-center justify-between gap-3 text-[13.5px]">
                  <span className="flex flex-col">
                    Try failed sends again
                    <span className="text-[12.5px] text-muted">Leads whose last message errored</span>
                  </span>
                  <Switch checked={retryFailed} onCheckedChange={setRetryFailed} />
                </label>
              </div>
            </div>
            {error ? <FormMessage>{error}</FormMessage> : null}
            <Button type="submit" className="self-start" disabled={starting || !message.trim() || campaign?.running}>
              <Megaphone />
              {campaign?.running ? "A campaign is sending" : starting ? "Starting" : "Start sending"}
            </Button>
          </form>
        </Panel>
      </PageSection>
    </Page>
  );
}
