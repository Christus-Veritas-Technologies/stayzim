import { existsSync } from "node:fs";

import { env } from "@stayzim/env/outreach";
import QRCode from "qrcode";
import wwebjs from "whatsapp-web.js";

import { PostgresSessionStore } from "./session-store";

// whatsapp-web.js is CommonJS, so named ESM imports don't resolve
const { Client, RemoteAuth } = wwebjs;

/**
 * How often each account's session is zipped and copied to Postgres. RemoteAuth
 * refuses anything under a minute; the session only changes materially when
 * WhatsApp rotates keys.
 */
const BACKUP_INTERVAL_MS = 5 * 60 * 1000;

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
};

let inboundHandler: ((event: InboundMessageEvent) => Promise<void>) | undefined;

/** Registers what to do with direct messages people send to any of our numbers. */
export function onInboundMessage(handler: (event: InboundMessageEvent) => Promise<void>) {
  inboundHandler = handler;
}

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

  private log(...args: unknown[]) {
    console.log(`[whatsapp:${this.id}] ${new Date().toISOString()}`, ...args);
  }

  private logError(...args: unknown[]) {
    console.error(`[whatsapp:${this.id}] ${new Date().toISOString()}`, ...args);
  }

  async start(executablePath: string | undefined): Promise<void> {
    const status = this.status;

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
    });

    // First backup lands ~1 minute after 'ready'; restart before then and the QR is needed again
    client.on("remote_session_saved", () => {
      status.lastSavedAt = new Date().toISOString();
      this.log("session backed up to Postgres");
    });

    client.on("message", async (message) => {
      const chatId = message.from;
      // Direct chats only: skip groups, status updates, channels and our own sends
      if (message.fromMe || message.isStatus || !/@(c\.us|lid)$/.test(chatId)) return;

      try {
        await inboundHandler?.({
          account: this.id,
          chatId,
          phone: await this.resolvePhone(chatId),
          body: message.body ?? "",
          type: message.type,
          whatsappMessageId: message.id._serialized,
          receivedAt: new Date(message.timestamp * 1000),
        });
      } catch (error) {
        this.logError("failed to record inbound message:", error);
      }
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
    });

    try {
      await client.initialize();
      this.log("initialize() resolved — waiting for 'ready'");
    } catch (error) {
      status.state = "failed";
      status.lastError = error instanceof Error ? error.message : String(error);
      this.logError("initialize failed:", error);
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

  /**
   * Makes sure WhatsApp Web has a chat with `id` before sending a first
   * message. whatsapp-web.js opens one with findOrCreateLatestChat and reads
   * `.chat` off the result; WhatsApp Web has changed that shape before, which
   * leaves the library with no chat and nothing sent. Opening it here, taking
   * either shape, puts it in the chat list where the library finds it.
   */
  private async openChat(id: string): Promise<boolean> {
    const page = (this.client as unknown as { pupPage?: { evaluate: <T>(fn: (id: string) => Promise<T>, id: string) => Promise<T> } }).pupPage;
    if (!page) return false;
    try {
      return await page.evaluate(async (chatId: string) => {
        // Runs inside WhatsApp Web
        const require = (globalThis as unknown as { require: (name: string) => any }).require;
        const wid = require("WAWebWidFactory").createWid(chatId);
        const chats = require("WAWebCollections").Chat;
        if (chats.get(wid)) return true;
        const found = await require("WAWebFindChatAction").findOrCreateLatestChat(wid);
        return Boolean(found?.chat ?? found) || Boolean(chats.get(wid));
      }, id);
    } catch (error) {
      this.logError(`opening a chat with ${id} failed:`, error);
      return false;
    }
  }

  async send(phone: string, message: string) {
    if (!this.client || !this.isReady) {
      throw new Error(`WhatsApp account ${this.id} is not connected (state: ${this.status.state})`);
    }

    // WhatsApp's own id for the number: null when it isn't on WhatsApp. Newer
    // WhatsApp Web can't open a first chat from the plain "<number>@c.us" form
    // (sendMessage then sends nothing and returns undefined), but it can from this.
    const numberId = await this.client.getNumberId(toChatId(phone));
    if (!numberId) {
      return { sent: false as const, reason: "not_on_whatsapp" as const };
    }

    const chatOpened = await this.openChat(numberId._serialized);
    if (!chatOpened) this.log(`couldn't open a chat with ${numberId._serialized} before sending; trying anyway`);

    // sendSeen: outbound-only, and it sidesteps the sendSeen/markedUnread crash
    // WD_logistics patches around (whatsapp-web.js issue #5741)
    const sent = await this.client.sendMessage(numberId._serialized, message, { sendSeen: false });
    if (!sent) {
      throw new Error("WhatsApp didn't send it: no chat could be opened with this number");
    }
    return { sent: true as const, account: this.id, id: sent.id._serialized };
  }
}

const accounts = new Map(env.WHATSAPP_ACCOUNTS.map((id) => [id, new WhatsAppAccount(id)]));
let nextIndex = 0;

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
  return all.map((_, i) => all[(nextIndex + i) % all.length]!).filter((account) => account.isReady);
}

/** Moves the rotation past `account`. */
export function markAccountUsed(account: WhatsAppAccount) {
  nextIndex = (accountIds.indexOf(account.id) + 1) % accountIds.length;
}

export async function startWhatsApp(): Promise<void> {
  if (!env.WHATSAPP_ENABLED) {
    console.log("[whatsapp] disabled by WHATSAPP_ENABLED=false");
    return;
  }

  const executablePath = resolveBrowser();
  console.log(
    `[whatsapp] starting ${accounts.size} account(s) [${accountIds.join(", ")}]: ` +
      `session path=${env.WHATSAPP_SESSION_PATH} browser=${executablePath ?? "none found"}`,
  );

  // Each account is its own Chromium; start them together so one waiting on a
  // QR scan doesn't hold the others back.
  await Promise.all([...accounts.values()].map((account) => account.start(executablePath)));
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
