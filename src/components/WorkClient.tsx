"use client";

import { toggleFavorite, useStored } from "@/lib/store";
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
