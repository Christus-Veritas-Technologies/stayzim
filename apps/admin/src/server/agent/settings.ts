import prisma from "@stayzim/db";
import { env } from "@stayzim/env/admin";

/**
 * The sales agent's switch: off (nothing), shadow (qualifies and logs, never
 * replies) or live (replies). AGENT_MODE is the default; the admin's switch
 * saves an override in app_setting, so it survives restarts.
 */
export type AgentMode = "off" | "shadow" | "live";
export const AGENT_MODES: AgentMode[] = ["off", "shadow", "live"];

const MODE_KEY = "agent_mode";
/** Read at most every 30 s (each inbound batch asks) */
const CACHE_MS = 30_000;
const cache = globalThis as unknown as { __stayzimAgentMode?: { mode: AgentMode; at: number } };

export async function getAgentMode(): Promise<AgentMode> {
  const cached = cache.__stayzimAgentMode;
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.mode;
  const row = await prisma.appSetting.findUnique({ where: { key: MODE_KEY } }).catch(() => null);
  const mode = row && (AGENT_MODES as string[]).includes(row.value) ? (row.value as AgentMode) : env.AGENT_MODE;
  cache.__stayzimAgentMode = { mode, at: Date.now() };
  return mode;
}

export async function setAgentMode(mode: AgentMode) {
  await prisma.appSetting.upsert({ where: { key: MODE_KEY }, create: { key: MODE_KEY, value: mode }, update: { value: mode } });
  cache.__stayzimAgentMode = { mode, at: Date.now() };
}

/** The numbers the agent answers on. It never sends campaigns from them. */
export function isAgentAccount(account: string) {
  return env.AGENT_ACCOUNTS.includes(account);
}

/** The agent can call its models (a key is set). */
export const agentConfigured = Boolean(env.OPENROUTER_API_KEY);
