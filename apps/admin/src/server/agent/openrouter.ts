import { env } from "@stayzim/env/admin";

/**
 * OpenRouter, for the sales agent's two kinds of model:
 * - chat completions with tools (the conversation: Claude Haiku 5.5, with a fallback);
 * - the Decisions API (Jev: fast typed answers with probabilities, for qualification).
 * Every call reports what it cost, so the admin can show it per lead.
 */

const BASE = "https://openrouter.ai/api";
const TIMEOUT_MS = 60_000;

function headers() {
  if (!env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY isn't set");
  return {
    Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    // OpenRouter shows these on its dashboard
    "HTTP-Referer": "https://admin.stayzim.co.zw",
    "X-Title": "StayZim sales agent",
  };
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${BASE}${path}`, { method: "POST", headers: headers(), body: JSON.stringify(body), signal: AbortSignal.timeout(TIMEOUT_MS) });
  const text = await response.text();
  if (!response.ok) throw new Error(`OpenRouter ${path} said ${response.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text) as T;
}

// ---------------------------------------------------------------------------
// Chat completions (with tools and images)
// ---------------------------------------------------------------------------

export type ChatContent = string | ({ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } })[];

export type ChatMessage =
  | { role: "system" | "user"; content: ChatContent }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };

export type ToolDefinition = {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

type ChatResponse = {
  model?: string;
  choices: { message: { content: string | null; tool_calls?: ToolCall[] }; finish_reason?: string }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number };
};

/** One model call. The fallback takes over when the main model errors (OpenRouter's `models`). */
export async function chat(input: { messages: ChatMessage[]; tools?: ToolDefinition[]; maxTokens?: number; temperature?: number }) {
  const models = [...new Set([env.AGENT_MODEL, env.AGENT_FALLBACK_MODEL])];
  const response = await post<ChatResponse>("/v1/chat/completions", {
    model: models[0],
    models,
    messages: input.messages,
    ...(input.tools?.length ? { tools: input.tools, tool_choice: "auto", parallel_tool_calls: false } : {}),
    max_tokens: input.maxTokens ?? 700,
    temperature: input.temperature ?? 0.5,
    usage: { include: true },
  });
  const choice = response.choices?.[0];
  if (!choice) throw new Error("OpenRouter returned no answer");
  return { message: choice.message, model: response.model ?? models[0]!, cost: response.usage?.cost ?? 0 };
}

// ---------------------------------------------------------------------------
// Decisions (Jev)
// ---------------------------------------------------------------------------

/**
 * A question for Jev: yes/no (noul), one of the options (choice) or a place on
 * a scale (score). Options are a record, option → what it means (Jev rejects
 * a plain list); answers name the option.
 */
export type DecisionQuestion =
  | { type: "noul"; instructions: string }
  | { type: "choice"; instructions: string; criteria: Record<string, string> }
  | { type: "score"; instructions: string; criteria: Record<string, string> };

/** Options whose names say what they mean: each maps to itself */
export const options = (list: readonly string[]) => Object.fromEntries(list.map((option) => [option, option]));

export type DecisionAnswer =
  | { type: "noul"; probability: number }
  | { type: "choice" | "score"; selected: string; probabilities: Record<string, number>; confidence: number };

export type DecisionState = (string | { type: "image_url"; image_url: { url: string } })[];

type DecisionsResponse = Record<string, unknown> & { usage?: { cost?: number } };

/** Asks Jev several questions about the same state in one call. */
export async function decide<Q extends Record<string, DecisionQuestion>>(state: DecisionState, questions: Q) {
  const response = await post<DecisionsResponse>("/alpha/decisions", { model: env.JEV_MODEL, state, questions });
  // The answers come keyed by question name (some responses wrap them)
  const source = (response.decisions ?? response.answers ?? response) as Record<string, unknown>;
  const answers = {} as Record<keyof Q, DecisionAnswer>;
  for (const name of Object.keys(questions) as (keyof Q)[]) {
    const answer = source[name as string] as DecisionAnswer | undefined;
    if (!answer) throw new Error(`Jev gave no answer to ${String(name)}`);
    answers[name] = answer;
  }
  return { answers, cost: response.usage?.cost ?? 0 };
}
