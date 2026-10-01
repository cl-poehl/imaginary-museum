"use client";

// Session state lives in localStorage and is read through useSyncExternalStore,
// so every client component sees the same history without a context provider.

import { useMemo, useSyncExternalStore } from "react";
import { getArtwork } from "@/data";
import { train, type Choice, type Model } from "./taste";

export type Stored = {
  history: Choice[];
  current: [string, string] | null;
  favorites: string[];
  captions: boolean;
  /** Whether the visitor has seen the short introduction. */
  introSeen: boolean;
};

const KEY = "ai-art-museum:v1";
const SERVER = "__server__";
const EMPTY: Stored = { history: [], current: null, favorites: [], captions: true, introSeen: false };

const listeners = new Set<() => void>();
let memory: string | null = null; // fallback when storage is blocked

function read(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return memory;
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export function writeStored(patch: Partial<Stored>) {
  const raw = JSON.stringify({ ...parse(read()), ...patch });
  memory = raw;
  try {
    window.localStorage.setItem(KEY, raw);
  } catch {}
  listeners.forEach((l) => l());
}

function parse(raw: string | null): Stored {
  if (!raw || raw === SERVER) return EMPTY;
  try {
    const s = JSON.parse(raw) as Stored;
    // Drop anything that points at artworks no longer in the collection.
    const known = (id: string) => Boolean(getArtwork(id));
    const history = (Array.isArray(s.history) ? s.history : []).filter((c) => known(c.a) && known(c.b));
    const current = s.current && s.current.every(known) ? s.current : null;
    const favorites = (Array.isArray(s.favorites) ? s.favorites : []).filter(known);
    // Anyone who already has picks has clearly found their way around.
    const introSeen = s.introSeen === true || history.length > 0;
    return { history, current, favorites, captions: s.captions !== false, introSeen };
  } catch {
    return EMPTY;
  }
}

export function useStored(): { stored: Stored; model: Model; ready: boolean } {
  const raw = useSyncExternalStore(subscribe, read, () => SERVER);
  const stored = useMemo(() => parse(raw), [raw]);
  const model = useMemo(() => train(stored.history, stored.favorites), [stored.history, stored.favorites]);
  return { stored, model, ready: raw !== SERVER };
}

export function toggleFavorite(id: string) {
  const { favorites } = parse(read());
  writeStored({ favorites: favorites.includes(id) ? favorites.filter((f) => f !== id) : [...favorites, id] });
}

/** Forget everything: picks, saved works and settings (and notes an earlier version cached). */
export function clearStored() {
  memory = null;
  try {
    window.localStorage.removeItem(KEY);
    for (const k of Object.keys(window.sessionStorage)) if (k.startsWith("curator:")) window.sessionStorage.removeItem(k);
  } catch {}
  listeners.forEach((l) => l());
}

/** Start over from inside the gallery: forget picks and saved works, skip the intro. */
export function startOver() {
  clearStored();
  writeStored({ introSeen: true });
}
