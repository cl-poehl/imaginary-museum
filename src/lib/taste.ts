// A small preference model (Bradley–Terry over weighted features).
// Each artwork is a bag of features: its traits, movement, artist, century,
// medium, and 16 components of its CLIP image embedding (how it looks). Every pick nudges the winner's features up and the loser's down, in
// proportion to how surprising the pick was. "Both", "neither" and saved works
// add absolute signals against an imagined average work. Replayed from history
// on every render, so undo is just "drop the last choice".

import { artworks, centuryLabel, getArtwork, getMovement, KIND_LABELS, mostFamous, TRAITS, type Artwork, type Kind } from "@/data";
import visual from "@/data/embeddings-pca.json";

export type Verdict = "both" | "neither";
export type Choice = { a: string; b: string; winner: string | null; verdict?: Verdict; at: number };

export type Model = {
  weights: Map<string, number>;
  counts: Map<string, number>;
  decided: number;
};

type Features = [string, number][];

const SCALE: Record<string, number> = { t: 1, m: 1, a: 0.8, c: 0.4, k: 0.8, v: 0.25 };
const VISUAL = (visual as { vectors: Record<string, number[]> }).vectors;
const LR = 0.35;
const L2 = 0.02;
const EPOCHS = 3;
const ABSOLUTE = 0.5; // "both"/"neither" teach less than a direct comparison
const FAVORITE = 0.8;

export function features(art: Artwork): Features {
  const f: Features = [
    ...art.traits.map((t): [string, number] => [`t:${t}`, SCALE.t]),
    [`m:${art.movement}`, SCALE.m],
    [`a:${art.artist}`, SCALE.a],
    [`c:${Math.floor(art.date / 100)}`, SCALE.c],
    [`k:${art.kind}`, SCALE.k],
  ];
  VISUAL[art.id]?.forEach((x, i) => f.push([`v:${i}`, SCALE.v * x]));
  return f;
}

const featureCache = new Map(artworks.map((a) => [a.id, features(a)]));
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

export function score(id: string, weights: Map<string, number>) {
  let s = 0;
  for (const [f, v] of featureCache.get(id) ?? []) s += v * (weights.get(f) ?? 0);
  return s;
}

function step(weights: Map<string, number>, diff: Map<string, number>, amount: number) {
  for (const [f, d] of diff) {
    if (d === 0) continue;
    const w = weights.get(f) ?? 0;
    weights.set(f, w + amount * d - L2 * Math.abs(amount) * w);
  }
}

function vector(id: string, sign = 1, into = new Map<string, number>()) {
  for (const [f, v] of featureCache.get(id) ?? []) into.set(f, (into.get(f) ?? 0) + sign * v);
  return into;
}

export const isInformative = (c: Choice) => Boolean(c.winner || c.verdict);

export function train(history: Choice[], favorites: string[] = []): Model {
  const weights = new Map<string, number>();
  const counts = new Map<string, number>();
  const informative = history.filter(isInformative);

  for (const c of history) {
    for (const id of [c.a, c.b]) {
      for (const [f] of featureCache.get(id) ?? []) counts.set(f, (counts.get(f) ?? 0) + 1);
    }
  }

  for (let epoch = 0; epoch < EPOCHS; epoch++) {
    const lr = LR / (epoch + 1);
    for (const c of informative) {
      if (c.winner) {
        const loser = c.winner === c.a ? c.b : c.a;
        const grad = 1 - sigmoid(score(c.winner, weights) - score(loser, weights));
        step(weights, vector(loser, -1, vector(c.winner)), lr * grad);
      } else {
        // Compare each work against an average one (score 0).
        for (const id of [c.a, c.b]) {
          const s = score(id, weights);
          const grad = c.verdict === "both" ? 1 - sigmoid(s) : -sigmoid(s);
          step(weights, vector(id), lr * ABSOLUTE * grad);
        }
      }
    }
    for (const id of favorites) {
      step(weights, vector(id), lr * FAVORITE * (1 - sigmoid(score(id, weights))));
    }
  }

  return { weights, counts, decided: informative.length + favorites.length };
}

/** 0–100 estimate of how much this person will like an artwork. */
export function fit(id: string, model: Model) {
  return Math.round(100 * sigmoid(0.45 * score(id, model.weights)));
}

/** How settled the model is, 0–1. Purely a function of how much signal it has seen. */
export const confidence = (model: Model) => model.decided / (model.decided + 12);

// ---------------------------------------------------------------------------
// Choosing the next pair

type Rng = () => number;

const pickOne = <T>(xs: T[], rng: Rng) => xs[Math.floor(rng() * xs.length)];

function distance(a: Artwork, b: Artwork) {
  const A = new Set(a.traits);
  const shared = b.traits.filter((t) => A.has(t)).length;
  const union = new Set([...a.traits, ...b.traits]).size;
  // Cap the date term so a 30,000-year-old figurine isn't always "most different".
  return 1 - shared / union + (a.movement !== b.movement ? 0.5 : 0) + Math.min(Math.abs(a.date - b.date), 800) / 1600;
}

export function nextPair(history: Choice[], model: Model, rng: Rng = Math.random): [string, string] {
  const shown = new Map<string, number>();
  for (const c of history) for (const id of [c.a, c.b]) shown.set(id, (shown.get(id) ?? 0) + 1);

  // Show every work before repeating any. Unseen works come first; once the
  // collection is used up, the least-shown return, but never anything from the
  // last stretch of rounds.
  const restRounds = Math.min(80, Math.floor(artworks.length / 4));
  const recent = new Set(history.slice(-restRounds).flatMap((c) => [c.a, c.b]));
  const unseen = artworks.filter((a) => !shown.has(a.id));
  let pool: Artwork[];
  if (unseen.length >= 12) {
    pool = unseen;
  } else {
    const rested = artworks.filter((a) => !recent.has(a.id));
    const minShown = Math.min(...rested.map((a) => shown.get(a.id) ?? 0));
    pool = [...unseen, ...rested.filter((a) => (shown.get(a.id) ?? 0) === minShown)];
    if (pool.length < 12) pool = rested.length >= 2 ? rested : artworks;
  }

  const novelty = (a: Artwork) => 1 / (1 + (shown.get(a.id) ?? 0));

  let first: Artwork;
  let second: Artwork;

  if (model.decided < 5) {
    // Cold start: sweep broadly. Take a fresh work and set it against something very different.
    // Lead with works everyone knows; the far side can come from anywhere.
    const lead = rng() < 0.75 ? pool.filter((a) => mostFamous.has(a.id)) : pool;
    const fresh = [...(lead.length ? lead : pool)].sort((x, y) => novelty(y) - novelty(x) || rng() - 0.5).slice(0, 12);
    first = pickOne(fresh, rng);
    second = [...pool]
      .filter((a) => a.id !== first.id)
      .map((a) => ({ a, s: distance(first, a) + novelty(a) + rng() * 0.6 }))
      .sort((x, y) => y.s - x.s)[0].a;
  } else {
    const uncertainty = (a: Artwork) =>
      (featureCache.get(a.id) ?? []).reduce((s, [f]) => (f[0] === "v" ? s : s + 1 / Math.sqrt(1 + (model.counts.get(f) ?? 0))), 0);

    // One likely favourite (exploit)...
    const ranked = pool
      .map((a) => ({ a, s: score(a.id, model.weights) + 0.8 * novelty(a) + rng() * 0.5 }))
      .sort((x, y) => y.s - x.s);
    first = pickOne(ranked.slice(0, 5), rng).a;

    let others = pool.filter((a) => a.id !== first.id && a.movement !== first.movement);
    if (!others.length) others = pool.filter((a) => a.id !== first.id);
    if (rng() < 0.45) {
      // ...against another strong candidate from a different epoch, to sharpen the ranking,
      second = pickOne(
        others
          .map((a) => ({ a, s: score(a.id, model.weights) + novelty(a) + rng() * 0.5 }))
          .sort((x, y) => y.s - x.s)
          .slice(0, 5),
        rng,
      ).a;
    } else {
      // ...or against something the model knows little about (explore).
      second = pickOne(
        others
          .map((a) => ({ a, s: uncertainty(a) + novelty(a) + rng() * 0.8 }))
          .sort((x, y) => y.s - x.s)
          .slice(0, 5),
        rng,
      ).a;
    }
  }

  return rng() < 0.5 ? [first.id, second.id] : [second.id, first.id];
}

// ---------------------------------------------------------------------------
// Explaining what was learned

export function featureLabel(f: string) {
  const [kind, id] = [f.slice(0, 1), f.slice(2)];
  if (kind === "t") return TRAITS[id]?.label ?? id;
  if (kind === "m") return getMovement(id)?.name ?? id;
  if (kind === "c") return centuryLabel(Number(id) * 100);
  if (kind === "k") return KIND_LABELS[id as Kind] ?? id;
  return id;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** One short line describing the most telling contrast in a pick. */
export function insightFor(choice: Choice, model: Model): string | null {
  if (choice.verdict) return verdictInsight(choice, model);
  if (!choice.winner) return null;
  const w = getArtwork(choice.winner)!;
  const l = getArtwork(choice.winner === choice.a ? choice.b : choice.a)!;
  const weight = (f: string) => Math.abs(model.weights.get(f) ?? 0);

  const candidates: { text: string; strength: number }[] = [];
  const groups = new Set(w.traits.concat(l.traits).map((t) => TRAITS[t]?.group));
  for (const g of groups) {
    const wOnly = w.traits.filter((t) => TRAITS[t]?.group === g && !l.traits.includes(t));
    const lOnly = l.traits.filter((t) => TRAITS[t]?.group === g && !w.traits.includes(t));
    if (!wOnly.length || !lOnly.length) continue;
    const best = (ts: string[]) => ts.sort((x, y) => weight(`t:${y}`) - weight(`t:${x}`))[0];
    const a = best(wOnly);
    const b = best(lOnly);
    candidates.push({
      text: `${cap(TRAITS[a].label)} over ${TRAITS[b].label}`,
      strength: weight(`t:${a}`) + weight(`t:${b}`),
    });
  }
  if (w.movement !== l.movement) {
    candidates.push({
      text: `${getMovement(w.movement)!.name} over ${getMovement(l.movement)!.name}`,
      strength: (weight(`m:${w.movement}`) + weight(`m:${l.movement}`)) * 0.9,
    });
  }
  candidates.sort((x, y) => y.strength - x.strength);
  return candidates[0]?.text ?? null;
}

function verdictInsight(choice: Choice, model: Model): string | null {
  const a = getArtwork(choice.a)!;
  const b = getArtwork(choice.b)!;
  const shared = a.traits.filter((t) => b.traits.includes(t));
  const pick = shared.sort((x, y) => Math.abs(model.weights.get(`t:${y}`) ?? 0) - Math.abs(model.weights.get(`t:${x}`) ?? 0))[0];
  if (choice.verdict === "both") {
    return pick ? `Both, perhaps for their ${TRAITS[pick].label}` : "Both. Your range just got wider";
  }
  return pick ? `Neither. ${cap(TRAITS[pick].label)} may not be for you` : "Neither. Noted, and set aside";
}

export type Lean = { feature: string; label: string; weight: number };

export function leanings(model: Model, prefix: "t" | "m" | "a" | "k") {
  const out: Lean[] = [];
  for (const [f, w] of model.weights) {
    if (f.startsWith(prefix + ":")) out.push({ feature: f, label: featureLabel(f), weight: w });
  }
  return out.sort((a, b) => b.weight - a.weight);
}

function list(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** A plain-language read of the profile. The LLM curator replaces this when it's available. */
export function summary(model: Model, person: "you" | "they" = "you"): string | null {
  if (model.decided < 3) return null;
  const P = person === "you" ? "You" : "They";
  const traits = leanings(model, "t");
  const moves = leanings(model, "m");
  const likes = traits.filter((t) => t.weight > 0.12).slice(0, 3).map((t) => t.label);
  const dislikes = traits.filter((t) => t.weight < -0.12).slice(-2).reverse().map((t) => t.label);
  const topMove = moves[0]?.weight > 0.12 ? moves[0].label : null;

  const parts: string[] = [];
  if (likes.length) parts.push(`${P} gravitate toward ${list(likes)}`);
  if (dislikes.length) parts.push(`${likes.length ? "and tend to pass on" : `${P} tend to pass on`} ${list(dislikes)}`);
  let text = parts.length ? parts.join(", ") + "." : `${P === "You" ? "Your" : "Their"} picks are still evenly spread.`;
  if (topMove) text += ` So far, ${topMove} is the epoch ${person} return to most.`;
  return text;
}
