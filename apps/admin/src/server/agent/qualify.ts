import type { DecisionAnswer, DecisionQuestion, DecisionState } from "./openrouter";

/**
 * Qualification, on every batch of messages someone sends the agent's number:
 * Jev answers a few typed questions (cheap, fast), and gate() turns them into
 * continue / ignore / stop / hand over. Ignored chats get blue ticks and no
 * reply. Thresholds live here, in one place, and are unit-tested against our
 * real chats.
 */

export const INTENTS = [
  "wants a website for their place to stay",
  "asking a question about StayZim or its prices",
  "just a greeting",
  "selling something to us, or spam",
  "looking for a job, or asking for money or help",
  "wrong number, or nothing to do with a place to stay",
  "wants us to stop messaging",
  "already a StayZim customer",
] as const;

export const FITS = [
  "not a place to stay",
  "unclear so far",
  "small or just starting",
  "an operating lodge, guesthouse or rental",
  "established, with several rooms or properties",
] as const;

export type Intent = (typeof INTENTS)[number];
export type Fit = (typeof FITS)[number];

/** Intents that never become a customer */
const JUNK: Intent[] = ["selling something to us, or spam", "looking for a job, or asking for money or help", "wrong number, or nothing to do with a place to stay"];

export function qualificationQuestions(withPhotos: boolean) {
  const questions: Record<string, DecisionQuestion> = {
    place_to_stay: {
      type: "noul",
      instructions:
        "The person messaging owns, runs or manages a place where guests pay to stay (a lodge, guesthouse, B&B, hotel, holiday home, Airbnb or furnished apartments), or is clearly asking about a website for one.",
    },
    intent: { type: "choice", instructions: "What the person messaging wants, judging by everything they have written so far.", criteria: [...INTENTS] },
    fit: { type: "score", instructions: "How established their place to stay is, from what they have said and shown.", criteria: [...FITS] },
    needs_human: {
      type: "noul",
      instructions:
        "The person is upset or angry, asks to speak to a person or for a call, reports a payment problem, or asks something only the business owner could decide (a discount, a custom deal, a contract).",
    },
  };
  if (withPhotos) {
    questions.photos_of_property = { type: "noul", instructions: "The photos they sent show rooms, buildings, a pool or grounds of a place where guests stay." };
  }
  return questions;
}

export type Qualification = {
  placeToStay: number;
  intent: Intent;
  intentConfidence: number;
  fit: Fit;
  needsHuman: number;
  /** Only when they sent photos */
  photosOfProperty?: number;
};

const probability = (answer: DecisionAnswer | undefined) => (answer && answer.type === "noul" ? answer.probability : 0);

/** Jev's answers as a Qualification (the shape saved on the lead). */
export function toQualification(answers: Record<string, DecisionAnswer>): Qualification {
  const intent = answers.intent;
  const fit = answers.fit;
  return {
    placeToStay: probability(answers.place_to_stay),
    intent: (intent && intent.type !== "noul" ? intent.selected : "just a greeting") as Intent,
    intentConfidence: intent && intent.type !== "noul" ? intent.confidence : 0,
    fit: (fit && fit.type !== "noul" ? fit.selected : "unclear so far") as Fit,
    needsHuman: probability(answers.needs_human),
    ...(answers.photos_of_property ? { photosOfProperty: probability(answers.photos_of_property) } : {}),
  };
}

export type GateDecision = { action: "continue" | "ignore" | "stop" | "handover"; reason: string };

/** Stages where they've shown they're real (sites made for them): never ignored from then on */
const PAST_QUALIFYING = ["OFFER", "CHOSEN", "PAYING", "PAID"];

/**
 * What to do with this batch. Ignore only when it's clear: losing a real lodge
 * costs more than one reply to a stranger, so when unsure the agent carries on.
 */
export function gate(current: Qualification, previous: Qualification | null, stage: string): GateDecision {
  if (current.intent === "wants us to stop messaging" && current.intentConfidence >= 0.6) {
    return { action: "stop", reason: "asked us to stop" };
  }
  if (current.needsHuman >= 0.7) return { action: "handover", reason: "needs a person" };
  if (PAST_QUALIFYING.includes(stage)) return { action: "continue", reason: "a lead we've made sites for" };

  const junk = JUNK.includes(current.intent);
  if (junk && current.intentConfidence >= 0.8 && current.placeToStay < 0.15) {
    return { action: "ignore", reason: current.intent };
  }
  // Photos of something else (selfies, products) and no sign of a place to stay
  if (current.photosOfProperty !== undefined && current.photosOfProperty < 0.1 && current.placeToStay < 0.2) {
    return { action: "ignore", reason: "photos aren't of a place to stay" };
  }
  // Two weak batches in a row: not a place to stay, twice
  const weak = (q: Qualification) => q.placeToStay < 0.25 && q.fit === "not a place to stay" && q.intent !== "wants a website for their place to stay";
  if (previous && weak(current) && weak(previous)) {
    return { action: "ignore", reason: "not a place to stay (twice)" };
  }
  return { action: "continue", reason: current.intent };
}

/** The state Jev sees: the conversation as text (newest last), plus any photos in this batch. */
export function qualificationState(transcript: string, photos: string[]): DecisionState {
  return [
    "A WhatsApp chat with StayZim, which builds websites for lodges, guesthouses, B&Bs and holiday homes in Zimbabwe. People reach us from a Facebook ad. 'StayZim:' lines are ours; 'Them:' lines are the person messaging.",
    transcript,
    ...photos.map((url) => ({ type: "image_url" as const, image_url: { url } })),
  ];
}
