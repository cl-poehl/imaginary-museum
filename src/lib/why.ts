// "Why this?" without an LLM: the reasons come straight from the taste model.
// A work ranks highly because a few of its features carry strong positive
// weight; we name those, count how many of the visitor's picks share them, and
// point to the chosen work it most resembles visually.

import { getArtist, getArtwork, getMovement, KIND_LABELS, TRAITS, type Kind } from "@/data";
import visual from "@/data/embeddings-pca.json";
import type { Stored } from "./store";
import { features, leanings, type Model } from "./taste";

const VISUAL = (visual as { vectors: Record<string, number[]> }).vectors;

function cosine(a: number[], b: number[]) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / Math.sqrt(na * nb || 1);
}

/** Works the visitor has shown they like: picks, "both", and saved works. */
function liked(stored: Stored) {
  const ids = new Set(stored.favorites);
  for (const c of stored.history) {
    if (c.winner) ids.add(c.winner);
    if (c.verdict === "both") [c.a, c.b].forEach((id) => ids.add(id));
  }
  return [...ids];
}

function list(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export type Why = { reasons: string[]; resembles: { id: string; title: string } | null };

export function whyFor(id: string, model: Model, stored: Stored): Why {
  const art = getArtwork(id);
  if (!art) return { reasons: [], resembles: null };
  const likedIds = liked(stored).filter((x) => x !== id);
  const likedWorks = likedIds.map((x) => getArtwork(x)).filter(Boolean) as NonNullable<ReturnType<typeof getArtwork>>[];
  const topEpoch = leanings(model, "m")[0]?.feature;
  const topArtist = leanings(model, "a")[0]?.feature;

  // Features pulling this work up, strongest first (visual components are summarised separately).
  const pulls = features(art)
    .filter(([f]) => !f.startsWith("v:") && !f.startsWith("c:"))
    .map(([f, v]) => ({ f, c: v * (model.weights.get(f) ?? 0) }))
    .filter((x) => x.c > 0.05)
    .sort((a, b) => b.c - a.c)
    .slice(0, 3);

  const traits = pulls.filter((p) => p.f.startsWith("t:")).map((p) => p.f.slice(2));
  const reasons: string[] = [];

  if (traits.length) {
    // Each trait with how many of the visitor's chosen works share it.
    const counted = traits.map((t, i) => {
      const n = likedWorks.filter((w) => w.traits.includes(t)).length;
      const label = TRAITS[t]?.label ?? t;
      return n > 1 ? `${label} (${n}${i === 0 ? " of your picks" : ""})` : label;
    });
    reasons.push(list(counted));
  }
  for (const p of pulls) {
    const key = p.f.slice(2);
    if (p.f.startsWith("m:")) {
      const n = likedWorks.filter((w) => w.movement === key).length;
      const name = getMovement(key)?.name ?? key;
      reasons.push(p.f === topEpoch ? `${name}, the epoch you return to most` : `${name}${n > 1 ? `, like ${n} of your picks` : ""}`);
    } else if (p.f.startsWith("a:")) {
      const name = getArtist(key)?.name ?? key;
      reasons.push(p.f === topArtist ? `by ${name}, the artist you choose most` : `by ${name}, whom you've chosen before`);
    } else if (p.f.startsWith("k:")) {
      reasons.push(`${KIND_LABELS[key as Kind] ?? key}, a medium you lean toward`);
    }
  }

  // The liked work it looks most like, if the resemblance is real.
  let resembles: Why["resembles"] = null;
  const v = VISUAL[id];
  if (v) {
    let best = -1;
    for (const w of likedWorks) {
      const u = VISUAL[w.id];
      if (!u) continue;
      const s = cosine(v, u);
      if (s > best) {
        best = s;
        resembles = { id: w.id, title: w.title };
      }
    }
    if (best < 0.55) resembles = null;
  }

  return { reasons, resembles };
}
