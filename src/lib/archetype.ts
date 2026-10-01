// Matches a visitor's learned taste to the pre-written archetypes.

import { getArtwork, getMovement, type Artwork } from "@/data";
import { ARCHETYPES, ECLECTIC, type Archetype } from "@/data/archetypes";
import type { Stored } from "./store";
import { features, type Model } from "./taste";

const relevant = (f: string) => f.startsWith("t:") || f.startsWith("m:") || f.startsWith("k:");

function norm(values: Iterable<number>) {
  let s = 0;
  for (const v of values) s += v * v;
  return Math.sqrt(s);
}

export type Strength = "clear" | "emerging" | "none";
export type Match = {
  primary: Archetype;
  secondary: Archetype | null;
  /** How sure the match is. Random clicking scores about 0.15–0.35; a consistent eye 0.5+. */
  strength: Strength;
  scores: { id: string; score: number }[];
};

export function matchArchetype(model: Model): Match {
  const weights = new Map([...model.weights].filter(([f]) => relevant(f)));
  const wNorm = norm(weights.values());
  if (model.decided < 4 || wNorm < 0.15) return { primary: ECLECTIC, secondary: null, strength: "none", scores: [] };

  const scores = ARCHETYPES.map((a) => {
    let dot = 0;
    for (const [f, s] of Object.entries(a.signature)) dot += s * (weights.get(f) ?? 0);
    return { archetype: a, score: dot / (wNorm * norm(Object.values(a.signature))) };
  }).sort((x, y) => y.score - x.score);

  const [first, second] = scores;
  const list = scores.map((s) => ({ id: s.archetype.id, score: s.score }));
  if (!first || first.score < 0.25) return { primary: ECLECTIC, secondary: null, strength: "none", scores: list };
  const strength: Strength = first.score >= 0.4 ? "clear" : "emerging";
  const secondary = second && second.score >= 0.25 && second.score >= first.score * 0.7 ? second.archetype : null;
  return { primary: first.archetype, secondary, strength, scores: list };
}

/** The full written profile: the primary portrait, plus the secondary streak. */
export function profileText(match: Match) {
  const streak = match.secondary ? ` There is also something of ${match.secondary.name} in you: ${match.secondary.streak}.` : "";
  return match.primary.prose + streak;
}

/** Works the visitor actually chose: picks, "both", and saved works. */
function chosenWorks(stored: Stored): Artwork[] {
  const ids = new Set(stored.favorites);
  for (const c of stored.history) {
    if (c.winner) ids.add(c.winner);
    if (c.verdict === "both") [c.a, c.b].forEach((id) => ids.add(id));
  }
  return [...ids].map((id) => getArtwork(id)).filter((a): a is Artwork => Boolean(a));
}

function list(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/**
 * The part of the profile that is about this visitor, built only from what they
 * chose. The pre-written prose describes the type; this line is the evidence.
 */
export function evidence(match: Match, stored: Stored): string | null {
  const chosen = chosenWorks(stored);
  if (!chosen.length) return null;

  if (match.primary.id === ECLECTIC.id) {
    const epochs = new Set(chosen.map((w) => w.movement));
    if (chosen.length < 2) return null;
    const byDate = [...chosen].sort((a, b) => a.date - b.date);
    const [oldest, newest] = [byDate[0], byDate[byDate.length - 1]];
    const span = epochs.size > 1 ? `across ${epochs.size} epochs` : `all from ${getMovement(oldest.movement)?.name}`;
    return `So far you have chosen ${chosen.length} works ${span}, from ${oldest.title} (${oldest.year}) to ${newest.title} (${newest.year}).`;
  }

  // Chosen works that best fit the archetype's signature.
  const sig = match.primary.signature;
  const fitting = chosen
    .map((w) => ({ w, s: features(w).reduce((sum, [f]) => sum + (sig[f] ?? 0), 0) }))
    .filter((x) => x.s > 0.5)
    .sort((a, b) => b.s - a.s)
    .slice(0, 3)
    .map((x) => x.w.title);
  return fitting.length ? `Among your picks: ${list(fitting)}.` : null;
}
