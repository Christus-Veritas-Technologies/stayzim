import { existsSync } from "node:fs";

import { env } from "@stayzim/env/admin";
import QRCode from "qrcode";
import wwebjs from "whatsapp-web.js";

import { isAgentAccount } from "../agent/settings";
import { PostgresSessionStore } from "./session-store";

// whatsapp-web.js is CommonJS, so named ESM imports don't resolve
const { Client, RemoteAuth } = wwebjs;

/**
 * How often each account's session is zipped and copied to Postgres. RemoteAuth
 * refuses anything under a minute; the session only changes materially when
 * WhatsApp rotates keys.
 */
const BACKUP_INTERVAL_MS = 5 * 60 * 1000;

/** Tries at starting each number's browser before calling it failed, and the wait between them. */
const START_ATTEMPTS = 3;
const RETRY_DELAY_MS = 10_000;

/** How long WhatsApp Web gets to say it's connected, to find a number, and to send. */
const CHECK_TIMEOUT_MS = 15_000;
const LOOKUP_TIMEOUT_MS = 30_000;
const SEND_TIMEOUT_MS = 60_000;

/** How often every connected number is checked, so a dead browser is found before a send needs it. */
const WATCH_EVERY_MS = 2 * 60 * 1000;

/**
 * Replies are also read from WhatsApp Web's own chats every 2 minutes (with the
 * connection check), not only from its "new message" event, which has never
 * recorded a reply in production. The first read after connecting looks back
 * this far, so replies missed before are picked up.
 */
const BACKFILL_DAYS = 14;
/** Each later read looks back this far before the last one, to be safe. */
const SYNC_OVERLAP_MS = 10 * 60 * 1000;
/** The newest messages read from each chat. */
const SYNC_MESSAGES_PER_CHAT = 30;

/** A number still starting or loading its chats after this long is restarted (it never got to "ready"). */
const STUCK_AFTER_MS = 8 * 60 * 1000;

/** After a disconnect (other than unlinking from the phone), when to start the browser again. */
const RECONNECT_DELAY_MS = 15_000;

/** WhatsApp Web's states that need the phone (scan again, or close WhatsApp on another computer). */
const NEEDS_THE_PHONE = new Set(["UNPAIRED", "UNPAIRED_IDLE", "CONFLICT", "DEPRECATED_VERSION", "PROXYBLOCK", "TOS_BLOCK", "SMB_TOS_BLOCK"]);

/** Rejects if `promise` takes longer than `ms`: a hung WhatsApp Web page never holds a send forever. */
function withTimeout<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`WhatsApp took more than ${Math.round(ms / 1000)} s ${what}`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

/** One store, one table, one row per account. */
const store = new PostgresSessionStore(env.WHATSAPP_SESSION_PATH);

export type ConnectionState =
  | "disabled"
  | "starting"
  | "qr"
  | "authenticated"
  | "ready"
  | "disconnected"
  | "failed";

export type WhatsAppStatus = {
  account: string;
  state: ConnectionState;
  /** Data-URL PNG of the pairing QR, present only while state is "qr". */
  qrDataUrl?: string;
  number?: string;
  pushName?: string;
  lastError?: string;
  /** When this account's session was last backed up to Postgres. */
  lastSavedAt?: string;
  /** When WhatsApp Web last confirmed this number is connected (before each send, and every 2 minutes). */
  lastCheckedAt?: string;
  /** When this number's chats were last read for replies, and how many new ones that found. */
  lastSyncedAt?: string;
  lastSyncFound?: number;
  /** Why the last read of the chats failed, when it did */
  lastSyncError?: string;
  startedAt: string;
};

export type InboundMessageEvent = {
  account: string;
  chatId: string;
  /** Digits only; undefined when WhatsApp hides the number behind a LID we can't resolve. */
  phone?: string;
  body: string;
  type: string;
  whatsappMessageId: string;
  receivedAt: Date;
  /** Their WhatsApp profile name, when WhatsApp gives it */
  senderName?: string;
  /** For a photo: downloads it (called only for a message not recorded before) */
  loadImage?: () => Promise<{ mimeType: string; data: Buffer } | null>;
};

/** Records a reply; true when it's new (not seen before). */
type InboundHandler = (event: InboundMessageEvent) => Promise<boolean>;

/**
 * What to do with replies, kept on globalThis like the numbers themselves:
 * Next.js can load this module more than once, and a handler set on one copy
 * was invisible to the browsers started by another.
 */
const handlerBox = globalThis as unknown as { __stayzimInbound?: InboundHandler };

/** Registers what to do with direct messages people send to any of our numbers. */
export function onInboundMessage(handler: InboundHandler) {
  handlerBox.__stayzimInbound = handler;
}

/**
 * A message sent from one of our numbers by someone on its phone (Kin), not by
 * the app: a command for the sales agent (/silence, /resume, /ban), or a reply
 * the agent should know about. Agent numbers only.
 */
export type OwnMessageEvent = {
  account: string;
  chatId: string;
  /** Digits only, when WhatsApp gives it */
  phone?: string;
  body: string;
  whatsappMessageId: string;
  sentAt: Date;
  /** Deletes it for everyone (a command the other person shouldn't see) */
  deleteForEveryone: () => Promise<boolean>;
};

const ownBox = globalThis as unknown as { __stayzimOwn?: (event: OwnMessageEvent) => Promise<void> };

/** Registers what to do with messages sent from an agent number's phone. */
export function onOwnMessage(handler: (event: OwnMessageEvent) => Promise<void>) {
  ownBox.__stayzimOwn = handler;
}

type WhatsAppMessage = {
  from: string;
  fromMe: boolean;
  isStatus: boolean;
  body?: string;
  type: string;
  timestamp: number;
  id: { _serialized: string };
  /** The sender's profile name (whatsapp-web.js keeps it in _data; our own list sets it directly) */
  notifyName?: string;
  _data?: { notifyName?: string };
};

/** A direct chat with a person (not a group, a status update or a channel). */
const DIRECT_CHAT = /@(c\.us|lid)$/;

/**
 * What a person sends: text, media, a location, a contact, a button tap.
 * Everything else in a chat is WhatsApp's own (security-code changes, call
 * logs, "notification_template", deleted messages) and never counts as a reply.
 */
export const MESSAGE_TYPES = ["chat", "image", "video", "audio", "ptt", "document", "sticker", "location", "vcard", "multi_vcard", "list_response", "buttons_response", "template_button_reply"];

/**
 * Puppeteer's own Chromium download is disabled in this workspace, so drive a
 * browser that is already installed instead.
 */
function resolveBrowser(): string | undefined {
  if (env.PUPPETEER_EXECUTABLE_PATH) return env.PUPPETEER_EXECUTABLE_PATH;
  return [
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].find((candidate) => existsSync(candidate));
}

/**
 * One linked WhatsApp number. Each account drives its own Chromium with its own
 * profile — WhatsApp Web keeps the login in the browser profile, so numbers
 * can't share one. RemoteAuth backs each profile up to Postgres as row
 * "RemoteAuth-<id>" and restores it on start.
 */
export class WhatsAppAccount {
  private client: InstanceType<typeof Client> | undefined;
  private readonly status: WhatsAppStatus;
  private executablePath: string | undefined;
  private restarting = false;
  private syncing = false;
  /** Seconds since 1970 of the last read of the chats; 0 until the first (which looks back BACKFILL_DAYS) */
  private syncedUntil = 0;

  constructor(readonly id: string) {
    this.status = {
      account: id,
      state: env.WHATSAPP_ENABLED ? "starting" : "disabled",
      startedAt: new Date().toISOString(),
    };
  }

  /** The whatsapp_session row RemoteAuth uses for this account. */
  get sessionName() {
    return `RemoteAuth-${this.id}`;
  }

  getStatus(): WhatsAppStatus {
    return { ...this.status };
  }

  get isReady() {
    return this.status.state === "ready";
  }

  /** Still starting or loading its chats long after it began: it never got to "ready". */
  get isStuck() {
    if (this.restarting || (this.status.state !== "starting" && this.status.state !== "authenticated")) return false;
    return Date.now() - Date.parse(this.status.startedAt) > STUCK_AFTER_MS;
  }

  private log(...args: unknown[]) {
    console.log(`[whatsapp:${this.id}] ${new Date().toISOString()}`, ...args);
  }

  private logError(...args: unknown[]) {
    console.error(`[whatsapp:${this.id}] ${new Date().toISOString()}`, ...args);
  }

  async start(executablePath: string | undefined, attempt = 1): Promise<void> {
    const status = this.status;
    this.executablePath = executablePath;

    const lastSavedAt = await store.lastSavedAt(this.sessionName).catch(() => null);
    status.lastSavedAt = lastSavedAt?.toISOString();
    this.log(lastSavedAt ? `restoring session saved ${status.lastSavedAt}` : "no saved session — expect a QR code");

    const client = new Client({
      authStrategy: new RemoteAuth({
        clientId: this.id,
        dataPath: env.WHATSAPP_SESSION_PATH,
        store,
        backupSyncIntervalMs: BACKUP_INTERVAL_MS,
      }),
      puppeteer: {
        headless: true,
        executablePath,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          // Containers default to a 64MB /dev/shm, which Chromium outgrows.
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
      },
    });
    this.client = client;

    client.on("loading_screen", (percent, message) => {
      this.log(`loading screen ${percent}%${message ? ` — ${message}` : ""}`);
    });

    client.on("change_state", (state) => {
      this.log(`connection state → ${state}`);
      if (state === "CONNECTED") status.state = "ready";
      if (state === "UNPAIRED" || state === "CONFLICT") status.state = "disconnected";
    });

    client.on("qr", async (qr) => {
      status.state = "qr";
      status.qrDataUrl = await QRCode.toDataURL(qr);
      // Also print it, so local dev doesn't need a browser to pair
      console.log(await QRCode.toString(qr, { type: "terminal", small: true }));
      this.log(`pairing QR generated — scan it above or at GET /whatsapp/qr/${this.id}`);
    });

    client.on("authenticated", () => {
      status.state = "authenticated";
      status.qrDataUrl = undefined;
      this.log("authenticated — WhatsApp accepted this session");
    });

    client.on("ready", () => {
      status.state = "ready";
      status.qrDataUrl = undefined;
      status.number = client.info?.wid?.user;
      status.pushName = client.info?.pushname;
      this.log(`ready as ${status.pushName ?? "unknown"} (${status.number ?? "?"})`);
      // Pick up replies that came in while it was away (and, the first time, the last BACKFILL_DAYS)
      setTimeout(() => void this.syncInbound(), 30_000).unref?.();
    });

    // First backup lands ~1 minute after 'ready'; restart before then and the QR is needed again
    client.on("remote_session_saved", () => {
      status.lastSavedAt = new Date().toISOString();
      this.log("session backed up to Postgres");
    });

    client.on("message", (message) => {
      void this.recordInbound(message as unknown as WhatsAppMessage, "event");
    });

    // Messages sent from this number (the app's, or typed on the phone): commands and Kin's own replies
    client.on("message_create", (message) => {
      if (!message.fromMe || !isAgentAccount(this.id)) return;
      void this.recordOwn({ ...(message as unknown as WhatsAppMessage), from: message.to });
    });

    client.on("auth_failure", (message) => {
      status.state = "failed";
      status.lastError = message;
      this.logError("auth failure:", message);
    });

    client.on("disconnected", async (reason) => {
      status.state = "disconnected";
      status.lastError = String(reason);
      this.logError("disconnected:", reason);

      // Unlinked from the phone: the stored session is now invalid, and restoring
      // it on the next boot would report a pairing that no longer exists.
      if (reason === "LOGOUT") {
        await store
          .delete({ session: this.sessionName })
          .catch((error) => this.logError("could not delete stored session:", error));
        status.lastSavedAt = undefined;
      }
      // Start again: from the saved session after WhatsApp Web reloads or the network
      // drops, or with a QR code to scan after a logout
      // (only if this browser is still the current one: not stopped for a redeploy, not restarted already)
      setTimeout(() => {
        if (this.client === client) void this.restart(`after a disconnect (${String(reason)})`);
      }, RECONNECT_DELAY_MS).unref?.();
    });

    try {
      await client.initialize();
      this.log("initialize() resolved — waiting for 'ready'");
    } catch (error) {
      status.lastError = error instanceof Error ? error.message : String(error);
      this.logError(`initialize failed (attempt ${attempt} of ${START_ATTEMPTS}):`, error);
      await client.destroy().catch(() => {});
      this.client = undefined;
      // WhatsApp Web often reloads itself while it starts ("Execution context was
      // destroyed"); a fresh browser a little later usually gets through
      if (attempt < START_ATTEMPTS) {
        status.state = "starting";
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        return this.start(executablePath, attempt + 1);
      }
      status.state = "failed";
    }
  }

  /**
   * Saves a message someone sent us (direct chats only: no groups, status
   * updates, channels or our own sends). Seen before: nothing happens. True
   * when it was new. `phone` (from the chat's contact, in a sync) is used when
   * WhatsApp's own lookup can't turn a LID into a number.
   */
  private async recordInbound(message: WhatsAppMessage, via: "event" | "sync", phone?: string): Promise<boolean> {
    const chatId = message.from;
    if (message.fromMe || message.isStatus || !DIRECT_CHAT.test(chatId) || !MESSAGE_TYPES.includes(message.type)) return false;
    const handler = handlerBox.__stayzimInbound;
    if (!handler) {
      this.logError("a reply came in, but nothing is set to record it");
      return false;
    }
    try {
      const resolved = (await this.resolvePhone(chatId)) ?? phone;
      const isNew = await handler({
        account: this.id,
        chatId,
        phone: resolved,
        body: message.body ?? "",
        type: message.type,
        whatsappMessageId: message.id._serialized,
        receivedAt: new Date(message.timestamp * 1000),
        senderName: message.notifyName ?? message._data?.notifyName ?? undefined,
        loadImage: message.type === "image" ? () => this.downloadImage(message.id._serialized) : undefined,
      });
      if (isNew) this.log(`reply recorded (${via}) from ${resolved ? `+${resolved}` : chatId}`);
      return isNew;
    } catch (error) {
      this.logError("failed to record inbound message:", error);
      return false;
    }
  }

  /**
   * A message sent from this number: passed on (after a pause, so the app's own
   * sends are recorded first and can be told apart) for commands and Kin's replies.
   * `message.from` holds the chat it was sent to.
   */
  private async recordOwn(message: WhatsAppMessage) {
    const chatId = message.from;
    const handler = ownBox.__stayzimOwn;
    if (!handler || !DIRECT_CHAT.test(chatId)) return;
    const age = Date.now() - message.timestamp * 1000;
    // Older ones (the read of the chats) are history, not commands or fresh replies
    if (age > 15 * 60 * 1000) return;
    // Just sent: give the app a moment to record its own send first
    if (age < 8000) await new Promise((resolve) => setTimeout(resolve, 8000 - age));
    try {
      await handler({
        account: this.id,
        chatId,
        phone: await this.resolvePhone(chatId),
        body: message.body ?? "",
        whatsappMessageId: message.id._serialized,
        sentAt: new Date(message.timestamp * 1000),
        deleteForEveryone: () => this.deleteForEveryone(message.id._serialized),
      });
    } catch (error) {
      this.logError("failed to handle a message sent from the phone:", error);
    }
  }

  /** Deletes one of our messages for everyone in the chat. */
  async deleteForEveryone(messageId: string) {
    try {
      const message = await withTimeout(this.client!.getMessageById(messageId), 15_000, "to find the message");
      await withTimeout(message.delete(true), 15_000, "to delete the message");
      return true;
    } catch (error) {
      this.logError(`deleting ${messageId} failed:`, error);
      return false;
    }
  }

  /**
   * Reads recent direct chats from WhatsApp Web and records every message from
   * the other person not recorded yet: the first time back BACKFILL_DAYS, then
   * from the last read. Replies don't depend on the "new message" event this way.
   */
  async syncInbound(): Promise<number> {
    const client = this.client;
    if (!client || !this.isReady || this.syncing) return 0;
    this.syncing = true;
    const startedAt = Math.floor(Date.now() / 1000);
    const since = this.syncedUntil > 0 ? this.syncedUntil - SYNC_OVERLAP_MS / 1000 : startedAt - BACKFILL_DAYS * 24 * 60 * 60;
    let found = 0;
    const problems: string[] = [];
    try {
      // 1. Every message WhatsApp Web has loaded, in one quick call (no chat list, no fetching)
      try {
        for (const message of await this.loadedMessages(since, isAgentAccount(this.id))) {
          if (message.fromMe) await this.recordOwn(message);
          else if (await this.recordInbound(message, "sync")) found += 1;
        }
      } catch (error) {
        problems.push(`loaded messages: ${errorText(error)}`);
        this.logError("reading the loaded messages failed:", error);
      }
      // 2. Chats with unread messages, read one by one (older messages WhatsApp Web hasn't loaded)
      try {
        const chats = await withTimeout(client.getChats(), 120_000, "to list the chats");
        for (const chat of chats) {
          const chatId = chat.id._serialized;
          if (chat.isGroup || !DIRECT_CHAT.test(chatId) || (chat.timestamp ?? 0) < since) continue;
          if (this.syncedUntil > 0 && !chat.unreadCount) continue;
          // For a LID chat, the contact's number when WhatsApp's LID lookup has none (and it isn't the LID itself)
          const contact = chatId.endsWith("@lid") ? await chat.getContact().catch(() => null) : null;
          const lid = chatId.split("@")[0];
          const number = contact?.number && contact.number !== lid && /^\d{6,20}$/.test(contact.number) ? contact.number : undefined;
          const messages = await withTimeout(chat.fetchMessages({ limit: SYNC_MESSAGES_PER_CHAT }), 30_000, "to read a chat").catch(() => []);
          for (const message of messages) {
            if (message.timestamp < since) continue;
            if (await this.recordInbound(message as unknown as WhatsAppMessage, "sync", number)) found += 1;
          }
        }
      } catch (error) {
        problems.push(`chat list: ${errorText(error)}`);
        this.logError("reading the unread chats failed:", error);
      }
      this.syncedUntil = startedAt;
      this.status.lastSyncedAt = new Date(startedAt * 1000).toISOString();
      this.status.lastSyncFound = found;
      this.status.lastSyncError = problems.length ? problems.join("; ") : undefined;
      if (found > 0) this.log(`read the chats: ${found} new ${found === 1 ? "reply" : "replies"}`);
    } finally {
      this.syncing = false;
    }
    return found;
  }

  /** WhatsApp Web's page, for reading its own message list. */
  private get page() {
    return (this.client as unknown as { pupPage?: { evaluate: <T, A>(fn: (arg: A) => T, arg: A) => Promise<T> } } | undefined)?.pupPage;
  }

  /** Messages other people sent (and, with `own`, ours too), already loaded in WhatsApp Web, since `since` (seconds). */
  private async loadedMessages(since: number, own = false): Promise<WhatsAppMessage[]> {
    const page = this.page;
    if (!page) return [];
    return withTimeout(
      page.evaluate(async ({ after, own, types }: { after: number; own: boolean; types: string[] }) => {
        // Runs inside WhatsApp Web
        const require = (globalThis as unknown as { require: (name: string) => any }).require;
        const { Chat, Msg } = require("WAWebCollections");
        // Direct chats active since `after`: load their earlier messages (what fetchMessages does), newest chats first
        let loader: any = null;
        try {
          loader = require("WAWebChatLoadMessages");
        } catch {
          // Another WhatsApp Web version: only what's loaded already
        }
        if (loader?.loadEarlierMsgs) {
          const chats = Chat.getModelsArray()
            .filter((chat: any) => !chat.isGroup && /@(c\.us|lid)$/.test(String(chat.id?._serialized ?? "")) && (chat.t ?? 0) >= after)
            .sort((a: any, b: any) => (b.t ?? 0) - (a.t ?? 0))
            .slice(0, 80);
          for (const chat of chats) {
            const oldest = chat.msgs?.getModelsArray?.()[0];
            if (oldest && oldest.t < after) continue;
            try {
              await loader.loadEarlierMsgs(chat);
            } catch {
              // This chat stays as it is
            }
          }
        }
        return Msg.getModelsArray()
          .filter((msg: any) => msg.id && (own || !msg.id.fromMe) && msg.t >= after && types.includes(String(msg.type ?? "chat")))
          .map((msg: any) => ({
            from: String(msg.id.remote?._serialized ?? msg.from?._serialized ?? ""),
            fromMe: Boolean(msg.id.fromMe),
            isStatus: Boolean(msg.isStatusV3) || String(msg.id.remote?._serialized ?? "") === "status@broadcast",
            body: String(msg.body ?? msg.caption ?? ""),
            type: String(msg.type ?? "chat"),
            timestamp: Number(msg.t),
            id: { _serialized: String(msg.id._serialized) },
            notifyName: msg.notifyName ? String(msg.notifyName) : undefined,
          }));
      }, { after: since, own, types: MESSAGE_TYPES }),
      90_000,
      "to list the messages",
    );
  }

  /** Marks a chat read (blue ticks), without replying. */
  async markRead(chatId: string) {
    if (!this.client || !this.isReady) return false;
    return withTimeout(this.client.sendSeen(chatId), 15_000, "to mark the chat read").catch((error: unknown) => {
      this.logError(`marking ${chatId} read failed:`, error);
      return false;
    });
  }

  /**
   * Puts the label `name` on a chat (WhatsApp Business labels) and takes the
   * others in `names` off it; labels outside `names` (the team's own) stay.
   * "missing" when this number has no label by that name (or isn't a Business account).
   */
  async setChatLabel(chatId: string, name: string, names: string[]): Promise<"set" | "same" | "missing" | "failed"> {
    const client = this.client;
    if (!client || !this.isReady) return "failed";
    try {
      const labels = await withTimeout(client.getLabels(), 15_000, "to list the labels");
      const byName = (wanted: string) => labels.find((label) => label.name.trim().toLowerCase() === wanted.toLowerCase());
      const target = byName(name);
      if (!target) return "missing";
      const managed = new Set(names.map((other) => byName(other)?.id).filter((id): id is string => id !== undefined).map(String));
      const current = (await withTimeout(client.getChatLabels(chatId), 15_000, "to read the chat's labels")).map((label) => String(label.id));
      const next = [...current.filter((id) => !managed.has(id)), String(target.id)];
      if (next.length === current.length && next.every((id) => current.includes(id))) return "same";
      await withTimeout(client.addOrRemoveLabels(next, [chatId]), 15_000, "to label the chat");
      return "set";
    } catch (error) {
      this.logError(`labelling ${chatId} "${name}" failed:`, error);
      return "failed";
    }
  }

  /**
   * Replies in a chat as a person would: marks it read, shows "typing…" for a
   * while that grows with the reply, then sends. Works for LID chats too (no
   * phone number needed). Returns WhatsApp's id for the message.
   */
  async replyInChat(chatId: string, text: string): Promise<string> {
    const client = this.client;
    if (!client || !(await this.verify())) throw new Error(`WhatsApp number ${this.id} isn't connected right now (${this.status.lastError ?? this.status.state})`);
    await this.markRead(chatId);
    const chat = await withTimeout(client.getChatById(chatId), 15_000, "to open the chat").catch(() => null);
    const typingMs = Math.min(8000, 2000 + text.length * 25);
    await chat?.sendStateTyping().catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, typingMs));
    await chat?.clearState().catch(() => {});
    const sent = await withTimeout(client.sendMessage(chatId, text, { sendSeen: false }), SEND_TIMEOUT_MS, "to send").catch(async (error: unknown) => {
      const found = await this.findJustSent(text);
      if (found) return { id: { _serialized: found } };
      throw error;
    });
    if (sent) return sent.id._serialized;
    const found = await this.findJustSent(text);
    if (found) return found;
    throw new Error("WhatsApp didn't confirm the message was sent, and it isn't in the chat");
  }

  /** A photo someone sent, as bytes; null when it isn't one or can't be downloaded. */
  async downloadImage(messageId: string): Promise<{ mimeType: string; data: Buffer } | null> {
    const client = this.client;
    if (!client) return null;
    try {
      const message = await withTimeout(client.getMessageById(messageId), 15_000, "to find the message");
      if (!message?.hasMedia || message.type !== "image") return null;
      const media = await withTimeout(message.downloadMedia(), 60_000, "to download the photo");
      return media?.data ? { mimeType: media.mimetype, data: Buffer.from(media.data, "base64") } : null;
    } catch (error) {
      this.logError(`downloading photo ${messageId} failed:`, error);
      return null;
    }
  }

  /**
   * "…@c.us" ids carry the phone number. "…@lid" ids don't — their digits are
   * NOT the phone — so ask WhatsApp for the mapping (unknown contacts may have none).
   */
  private async resolvePhone(chatId: string): Promise<string | undefined> {
    if (chatId.endsWith("@c.us")) return chatId.split("@")[0];
    try {
      const pn = (await this.client?.getContactLidAndPhone([chatId]))?.[0]?.pn;
      const digits = pn?.split("@")[0];
      return digits && /^\d{6,20}$/.test(digits) ? digits : undefined;
    } catch (error) {
      this.logError(`lid ${chatId} phone lookup failed:`, error);
      return undefined;
    }
  }

  async stop(): Promise<void> {
    this.log("stopping");
    await this.client?.destroy().catch((error) => this.logError("destroy failed:", error));
    this.client = undefined;
  }

  /** Closes this number's browser and starts it again from the saved session. One at a time. */
  async restart(why: string): Promise<void> {
    if (this.restarting || !env.WHATSAPP_ENABLED) return;
    this.restarting = true;
    this.log(`restarting ${why}`);
    try {
      await this.stop();
      this.status.state = "starting";
      this.status.startedAt = new Date().toISOString();
      // A start that hangs doesn't hold the number forever: the next check can restart it again
      await withTimeout(this.start(this.executablePath ?? resolveBrowser()), STUCK_AFTER_MS, "to start");
    } catch (error) {
      this.status.state = "failed";
      this.status.lastError = errorText(error);
      this.logError("restart failed:", error);
    } finally {
      this.restarting = false;
    }
  }

  /**
   * Asks WhatsApp Web whether this number is really connected, rather than
   * trusting the last event. A browser that doesn't answer is restarted; a
   * number that needs its phone is marked disconnected. True when it can send.
   */
  async verify(): Promise<boolean> {
    const client = this.client;
    if (!client || !this.isReady) return false;
    try {
      const state = await withTimeout(client.getState(), CHECK_TIMEOUT_MS, "to say whether it's connected");
      if (state === "CONNECTED") {
        this.status.lastCheckedAt = new Date().toISOString();
        return true;
      }
      this.status.lastError = `WhatsApp Web says ${state ?? "nothing"}`;
      this.logError(`not connected: ${this.status.lastError}`);
      if (state && NEEDS_THE_PHONE.has(state)) this.status.state = "disconnected";
      // Anything else (opening, reconnecting) passes; this number sits this send out
      return false;
    } catch (error) {
      // The page or the browser is gone: start it again
      this.status.state = "disconnected";
      this.status.lastError = errorText(error);
      this.logError("didn't answer the connection check:", error);
      void this.restart("after a failed connection check");
      return false;
    }
  }

  /**
   * The message this account just sent with exactly `body`, found in WhatsApp
   * Web's own message list. whatsapp-web.js returns the sent message by looking
   * it up under the key it made; WhatsApp now files messages to new chats under
   * the contact's LID instead, so that lookup comes back empty for a message
   * that did go. Every first message names the lodge, so the body and the last
   * few minutes are enough to find it.
   */
  private async findJustSent(body: string): Promise<string | null> {
    const page = (this.client as unknown as { pupPage?: { evaluate: <T>(fn: (body: string) => T, body: string) => Promise<T> } }).pupPage;
    if (!page) return null;
    try {
      return await page.evaluate((text: string) => {
        // Runs inside WhatsApp Web
        const require = (globalThis as unknown as { require: (name: string) => any }).require;
        const since = Date.now() / 1000 - 300;
        const sent = require("WAWebCollections")
          .Msg.getModelsArray()
          .filter((msg: any) => msg.id?.fromMe && msg.body === text && msg.t >= since);
        return sent.length > 0 ? String(sent[sent.length - 1].id._serialized) : null;
      }, body);
    } catch (error) {
      this.logError("looking for the sent message failed:", error);
      return null;
    }
  }

  async send(phone: string, message: string) {
    const client = this.client;
    if (!client || !(await this.verify())) {
      throw new Error(`WhatsApp number ${this.id} isn't connected right now (${this.status.lastError ?? this.status.state})`);
    }

    // WhatsApp's own id for the number: null when it isn't on WhatsApp
    const numberId = await withTimeout(client.getNumberId(toChatId(phone)), LOOKUP_TIMEOUT_MS, "to look the number up");
    if (!numberId) {
      return { sent: false as const, reason: "not_on_whatsapp" as const };
    }

    // sendSeen: outbound-only, and it sidesteps the sendSeen/markedUnread crash
    // WD_logistics patches around (whatsapp-web.js issue #5741)
    const sent = await withTimeout(client.sendMessage(numberId._serialized, message, { sendSeen: false }), SEND_TIMEOUT_MS, "to send").catch(async (error: unknown) => {
      // A slow or failed answer doesn't mean nothing went: look before calling it failed
      const found = await this.findJustSent(message);
      if (found) return { id: { _serialized: found } };
      throw error;
    });
    if (sent) return { sent: true as const, account: this.id, id: sent.id._serialized };

    // No message back doesn't mean nothing went: check WhatsApp's own list before calling it failed
    const found = await this.findJustSent(message);
    if (found) return { sent: true as const, account: this.id, id: found };
    throw new Error("WhatsApp didn't confirm the message was sent, and it isn't in the chat");
  }
}

/**
 * One set of numbers per server process. Kept on globalThis because Next.js can
 * load this module more than once (the instrumentation hook, each route, and
 * again on every edit in development), and each copy would start its own Chromiums.
 */
const shared = globalThis as unknown as {
  __stayzimWhatsApp?: { accounts: Map<string, WhatsAppAccount>; nextIndex: number; started: boolean };
};
const engine = (shared.__stayzimWhatsApp ??= {
  accounts: new Map(env.WHATSAPP_ACCOUNTS.map((id) => [id, new WhatsAppAccount(id)])),
  nextIndex: 0,
  started: false,
});

/** Every 2 minutes, each connected number proves it still is (and a dead browser is restarted). */
function watchAccounts() {
  const timer = setInterval(() => {
    for (const account of engine.accounts.values()) {
      if (account.isStuck) {
        void account.restart("after being stuck while starting");
        continue;
      }
      if (!account.isReady) continue;
      void account.verify().then((connected) => (connected ? account.syncInbound() : 0));
    }
  }, WATCH_EVERY_MS);
  timer.unref?.();
}
const accounts = engine.accounts;

export const accountIds = [...accounts.keys()];

export function getAccount(id: string) {
  return accounts.get(id);
}

export function getStatuses(): WhatsAppStatus[] {
  return [...accounts.values()].map((account) => account.getStatus());
}

/**
 * Connected accounts in round-robin order, starting after the last one used,
 * so outreach volume is spread over every number.
 */
export function readyAccountsInRotation(): WhatsAppAccount[] {
  const all = [...accounts.values()];
  return all.map((_, i) => all[(engine.nextIndex + i) % all.length]!).filter((account) => account.isReady);
}

/** Moves the rotation past `account`. */
export function markAccountUsed(account: WhatsAppAccount) {
  engine.nextIndex = (accountIds.indexOf(account.id) + 1) % accountIds.length;
}

export async function startWhatsApp(): Promise<void> {
  if (engine.started) return;
  engine.started = true;
  if (!env.WHATSAPP_ENABLED) {
    console.log("[whatsapp] disabled by WHATSAPP_ENABLED=false");
    return;
  }

  const executablePath = resolveBrowser();
  console.log(
    `[whatsapp] starting ${accounts.size} account(s) [${accountIds.join(", ")}]: ` +
      `session path=${env.WHATSAPP_SESSION_PATH} browser=${executablePath ?? "none found"}`,
  );

  watchAccounts();
  // Each account is its own Chromium; start them together so one waiting on a
  // QR scan doesn't hold the others back. One failing never stops the others.
  await Promise.allSettled([...accounts.values()].map((account) => account.start(executablePath)));
}

export async function stopWhatsApp(): Promise<void> {
  await Promise.all([...accounts.values()].map((account) => account.stop()));
}

/** "+263 77 123 4567" → "263771234567". Numbers must include the country code. */
export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

/** Converts a phone number like "+263 77 123 4567" to a WhatsApp chat id. */
export function toChatId(phone: string) {
  return `${normalizePhone(phone)}@c.us`;
}
