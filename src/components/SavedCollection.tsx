"use client";

import Link from "next/link";
import { getArtwork, type Artwork } from "@/data";
import { toggleFavorite, useStored } from "@/lib/store";
import { visitInfo } from "@/lib/visit";
import { ArtCard } from "./ArtworkGrid";
import { Heart } from "./Duel";

export function SavedCollection() {
  const { stored, ready } = useStored();
  if (!ready) return <div className="h-96" />;

  const works = stored.favorites.map((id) => getArtwork(id)).filter((a): a is Artwork => Boolean(a)).reverse();

  // Group by where they hang, so a trip can be planned around them.
  const places = new Map<string, { map: string | null; works: Artwork[] }>();
  for (const w of works) {
    const v = visitInfo(w);
    if (v.isPrivate) continue;
    const entry = places.get(v.place) ?? { map: v.map, works: [] };
    entry.works.push(w);
    places.set(v.place, entry);
  }

  return (
    <div className="flex flex-col">
      <header className="flex flex-col gap-4 border-b border-line pt-12 pb-10">
        <p className="label text-muted">Your collection</p>
        <h1 className="font-serif text-[34px] leading-tight md:text-[40px]">
          {works.length ? `${works.length} saved ${works.length === 1 ? "work" : "works"}` : "Nothing saved yet"}
        </h1>
        <p className="max-w-xl text-muted">
          {works.length
            ? "Saving a work tells your curator more than a single pick does. It is stored in this browser only for now."
            : "Tap Save under any work you would hang on your own wall. Your curator counts it as a strong signal."}
        </p>
        {!works.length && (
          <Link href="/" className="aurora-bg mt-2 w-fit rounded-full px-5 py-2.5 text-sm font-medium text-bg">
            Start choosing →
          </Link>
        )}
      </header>

      {works.length > 0 && (
        <section className="border-b border-line py-14">
          <ul className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {works.map((a) => (
              <li key={a.id}>
                <ArtCard art={a}>
                  <button
                    onClick={() => toggleFavorite(a.id)}
                    className="mt-2 flex items-center gap-1.5 text-xs text-accent transition-colors hover:text-muted"
                  >
                    <Heart filled /> Remove
                  </button>
                </ArtCard>
              </li>
            ))}
          </ul>
        </section>
      )}

      {places.size > 0 && (
        <section className="py-14">
          <h2 className="mb-2 font-serif text-[22px]">See them in person</h2>
          <p className="mb-8 text-sm text-muted">Locations as last recorded. Works travel and rotate, so check with the museum before you go.</p>
          <ul className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
            {[...places].map(([place, { map, works }]) => (
              <li key={place} className="flex flex-col gap-2 bg-bg p-5">
                <div className="flex items-start justify-between gap-4">
                  <p className="font-serif text-[16px] leading-tight">{place}</p>
                  {map && (
                    <a href={map} target="_blank" rel="noreferrer" className="label shrink-0 text-muted transition-colors hover:text-fg">
                      Map ↗
                    </a>
                  )}
                </div>
                <p className="text-sm text-muted">{works.map((w) => w.title).join(" · ")}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
