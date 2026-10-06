"use client";

import { buttonVariants } from "@stayzim/ui/components/button";
import { Card } from "@stayzim/ui/components/card";
import { CopyButton } from "@stayzim/ui/components/copy-button";
import { Textarea } from "@stayzim/ui/components/textarea";
import { cn } from "@stayzim/ui/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Pencil } from "lucide-react";
import { useState } from "react";

import { useLodge } from "@/components/dashboard/lodge-provider";
import { WhatsAppIcon } from "@/components/landing/brand";
import { shareMessage, siteHost, siteUrl } from "@/lib/lodge";
import { whatsappTextUrl } from "@/lib/whatsapp";

/** The owner's link and a way to tick "Share your link" off the setup checklist. */
export function useShareLink() {
  const { lodge, save } = useLodge();
  return {
    url: siteUrl(lodge),
    message: shareMessage(lodge),
    /** WhatsApp asks who to send it to: past guests, groups, a status */
    whatsappUrl: (text = shareMessage(lodge)) => whatsappTextUrl(text),
    markShared: () => {
      if (!lodge.linkSharedAt) void save("/shared", "POST");
    },
  };
}

/** Send your link: the message past guests get, ready to share on WhatsApp. */
export function ShareCard({ className }: { className?: string }) {
  const { lodge } = useLodge();
  const share = useShareLink();
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState(share.message);
  const host = siteHost(lodge);
  const [before, after] = message.includes(host) ? message.split(host) : [message, null];

  return (
    <Card className={cn("gap-3.5 px-5 pt-[18px] pb-5", className)}>
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[15px] font-semibold">Send your link</h2>
        <p className="text-[13px] text-muted">Past guests book direct when you ask them.</p>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {editing ? (
          <motion.div key="edit" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Textarea
              aria-label="Message to send"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="min-h-28"
              maxLength={600}
              autoFocus
            />
          </motion.div>
        ) : (
          <motion.p
            key="bubble"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-[14px] rounded-bl-[4px] bg-surface-2 px-3.5 py-3 text-[13.5px] leading-5 break-words"
          >
            {before}
            {after !== null ? <span className="font-semibold text-brand">{host}</span> : null}
            {after}
          </motion.p>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setEditing((value) => !value)}
        className="-my-2.5 inline-flex w-fit items-center gap-1.5 py-2.5 text-[13px] font-semibold text-muted hover:text-ink"
      >
        <Pencil className="size-3.5" />
        {editing ? "Done editing" : "Edit message"}
      </button>

      <div className="mt-auto flex flex-col gap-2">
        <a
          href={share.whatsappUrl(message)}
          target="_blank"
          rel="noreferrer"
          onClick={share.markShared}
          className={buttonVariants({ variant: "whatsapp", size: "lg", className: "w-full" })}
        >
          <WhatsAppIcon size={17} />
          Share on WhatsApp
        </a>
        <CopyButton value={share.url} onCopied={share.markShared} className="w-full" copiedLabel="Link copied">
          Copy link
        </CopyButton>
      </div>
    </Card>
  );
}
