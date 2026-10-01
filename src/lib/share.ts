// A taste profile packed into a URL-safe string, so sharing needs no backend.

import { getArtwork } from "@/data";
import type { Stored } from "./store";
import { leanings, type Model } from "./taste";

type Packed = {
  v: 1;
  n: number; // signals
  w: [string, number][]; // feature, weight × 100
  f: string[]; // saved works
  c: string[]; // recent picks
};

function toBase64Url(s: string) {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodeShare(model: Model, stored: Stored) {
  const pick = (prefix: "t" | "m" | "k" | "a", n: number) =>
    leanings(model, prefix)
      .filter((l) => Math.abs(l.weight) > 0.05)
      .filter((_, i, all) => i < n || i >= all.length - 2)
      .map((l): [string, number] => [l.feature, Math.round(l.weight * 100)]);
  const packed: Packed = {
    v: 1,
    n: model.decided,
    w: [...pick("t", 8), ...pick("m", 5), ...pick("k", 3), ...pick("a", 3)],
    f: stored.favorites.slice(-12),
    c: stored.history.flatMap((c) => (c.winner ? [c.winner] : [])).slice(-6),
  };
  return toBase64Url(JSON.stringify(packed));
}

export function decodeShare(s: string | null): { model: Model; favorites: string[]; chosen: string[] } | null {
  if (!s) return null;
  try {
    const p = JSON.parse(fromBase64Url(s)) as Packed;
    if (p.v !== 1 || !Array.isArray(p.w)) return null;
    const weights = new Map(p.w.filter(([f, w]) => typeof f === "string" && typeof w === "number").map(([f, w]) => [f, w / 100]));
    const known = (id: unknown): id is string => typeof id === "string" && Boolean(getArtwork(id));
    return {
      model: { weights, counts: new Map(), decided: Number(p.n) || 0 },
      favorites: (p.f ?? []).filter(known),
      chosen: (p.c ?? []).filter(known),
    };
  } catch {
    return null;
  }
}
