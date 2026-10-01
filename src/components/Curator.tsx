"use client";

import { useEffect, useState } from "react";
import { getArtwork, KIND_LABELS, type Kind } from "@/data";
import type { Stored } from "@/lib/store";
import { leanings, type Model } from "@/lib/taste";

export type CuratorRequest =
  | { task: "profile"; profile: CuratorProfile }
  | { task: "why"; artworkId: string; profile: CuratorProfile }
  | { task: "work"; artworkId: string }
  | { task: "artist"; artistId: string };

export type CuratorProfile = ReturnType<typeof profileFor>;

const round = (x: number) => Math.round(x * 100) / 100;
const titled = (id: string) => {
  const a = getArtwork(id);
  return a ? `${a.title} (${a.year})` : id;
};

/** A compact, serialisable summary of the model for the curator prompt. */
export function profileFor(model: Model, stored: Stored) {
  const top = (prefix: "t" | "m" | "a" | "k", n: number) => {
    const all = leanings(model, prefix).filter((l) => Math.abs(l.weight) > 0.05);
    const pos = all.slice(0, n);
    const neg = all.filter((l) => l.weight < 0).slice(-Math.ceil(n / 2));
    return [...pos, ...neg.filter((x) => !pos.includes(x))].map((l) => ({
      label: prefix === "k" ? (KIND_LABELS[l.feature.slice(2) as Kind] ?? l.label) : l.label,
      weight: round(l.weight),
    }));
  };
  const recent = stored.history.filter((c) => c.winner).slice(-12);
  return {
    traits: top("t", 8).slice(0, 12),
    epochs: top("m", 5).slice(0, 8),
    artists: top("a", 4).slice(0, 6),
    media: top("k", 3).slice(0, 6),
    chosen: recent.map((c) => titled(c.winner!)),
    passed: recent.map((c) => titled(c.winner === c.a ? c.b : c.a)),
    saved: stored.favorites.slice(-12).map(titled),
  };
}

type State = { text: string; status: "idle" | "streaming" | "done" | "unavailable" };

const cacheKey = (key: string) => `curator:${key}`;

function readCache(key: string) {
  try {
    return sessionStorage.getItem(cacheKey(key));
  } catch {
    return null;
  }
}

/** Streams a curator response. `key` decides when to ask again. */
export function useCurator(request: CuratorRequest | null, key: string, enabled = true): State {
  const [state, setState] = useState<State & { key: string }>({ text: "", status: "idle", key: "" });

  useEffect(() => {
    if (!request || !enabled) return;
    const cached = readCache(key);
    const controller = new AbortController();

    (async () => {
      if (cached) {
        setState({ text: cached, status: "done", key });
        return;
      }
      setState({ text: "", status: "streaming", key });
      try {
        const res = await fetch("/api/curator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error(String(res.status));
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let text = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          text += value;
          setState({ text, status: "streaming", key });
        }
        setState({ text, status: "done", key });
        try {
          sessionStorage.setItem(cacheKey(key), text);
        } catch {}
      } catch {
        if (!controller.signal.aborted) setState({ text: "", status: "unavailable", key });
      }
    })();

    return () => controller.abort();
    // The key captures everything that should trigger a new request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  return state.key === key ? state : { text: "", status: enabled && request ? "streaming" : "idle" };
}

/** Streaming text with a small aurora caret while the curator is writing. */
export function CuratorText({ state, fallback, className = "" }: { state: State; fallback?: React.ReactNode; className?: string }) {
  if (state.status === "unavailable" || (state.status === "idle" && fallback)) return <>{fallback}</>;
  if (state.status === "streaming" && !state.text) {
    return (
      <span className={`inline-flex items-center gap-2 text-muted ${className}`}>
        <span className="orb orb-thinking size-2.5 rounded-full" /> The curator is looking…
      </span>
    );
  }
  return (
    <span className={className}>
      {state.text}
      {state.status === "streaming" && <span className="aurora-bg ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse" />}
    </span>
  );
}

export function AiBadge({ children = "Written by the AI curator" }: { children?: React.ReactNode }) {
  return (
    <span className="label inline-flex items-center gap-2 text-faint">
      <span className="orb size-2 rounded-full" />
      {children}
    </span>
  );
}
