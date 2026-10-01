"use client";

import { useState } from "react";
import { toggleFavorite, useStored } from "@/lib/store";
import { AiBadge, CuratorText, useCurator } from "./Curator";
import { Heart } from "./Duel";

export function SaveButton({ id }: { id: string }) {
  const { stored, ready } = useStored();
  const saved = ready && stored.favorites.includes(id);
  return (
    <button
      onClick={() => toggleFavorite(id)}
      aria-pressed={saved}
      className={`label flex items-center gap-2 border-b pb-0.5 transition-colors ${
        saved ? "border-accent/50 text-accent" : "border-transparent text-muted hover:text-fg"
      }`}
    >
      <Heart filled={saved} />
      {saved ? "In your collection" : "Save to collection"}
    </button>
  );
}

/**
 * The AI curator's note. Opens by itself when the museum gave us no text
 * (`auto`), otherwise waits to be asked.
 */
export function CuratorNote({ task, id, auto }: { task: "work" | "artist"; id: string; auto: boolean }) {
  const [asked, setAsked] = useState(auto);
  const request = task === "work" ? { task, artworkId: id } : { task, artistId: id };
  const state = useCurator(request, `${task}:${id}`, asked);

  if (!asked) {
    return (
      <button
        onClick={() => setAsked(true)}
        className="label flex w-fit items-center gap-2 text-faint transition-colors hover:text-fg"
      >
        <span className="orb size-1.5 rounded-full" />
        Ask the curator for more
      </button>
    );
  }

  if (state.status === "unavailable") {
    return auto ? (
      <p className="text-sm text-faint">
        No museum text for this one yet. With an ANTHROPIC_API_KEY set, the AI curator writes a note here.
      </p>
    ) : (
      <p className="text-sm text-faint">The curator is offline. Add an ANTHROPIC_API_KEY to .env.local to switch it on.</p>
    );
  }

  return (
    <div className="border-l border-accent/40 pl-4">
      <div className="mb-1.5">
        <AiBadge>AI curator&apos;s note · may contain errors</AiBadge>
      </div>
      <p className="text-[13px] leading-relaxed text-muted">
        <CuratorText state={state} />
      </p>
    </div>
  );
}
