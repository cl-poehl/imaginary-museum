"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { getArtwork, TRAITS } from "@/data";
import { decodeShare } from "@/lib/share";
import { matchArchetype } from "@/lib/archetype";
import { leanings, summary } from "@/lib/taste";
import { ArtCard } from "./ArtworkGrid";
import { Bars } from "./TasteProfile";

export function SharedProfile() {
  const params = useSearchParams();
  const shared = useMemo(() => decodeShare(params.get("p")), [params]);

  if (!shared) {
    return (
      <div className="flex flex-col items-start gap-6 pt-24">
        <h1 className="font-serif text-[34px] leading-tight">This link doesn&apos;t open</h1>
        <p className="text-muted">It may have been cut off when it was copied.</p>
        <Link href="/?route=taste" className="link text-sm">
          Find your own taste →
        </Link>
      </div>
    );
  }

  const { model, favorites, chosen } = shared;
  const match = matchArchetype(model);
  const traits = leanings(model, "t").filter((l) => TRAITS[l.feature.slice(2)]);
  const epochs = leanings(model, "m");
  const works = [...new Set([...favorites, ...chosen])].map((id) => getArtwork(id)!).slice(0, 8);

  return (
    <div className="flex flex-col">
      <header className="flex flex-col gap-8 border-b border-line pt-12 pb-10">
        <p className="label text-muted">A shared taste · {model.decided} signals</p>
        {match.strength !== "none" && (
          <div>
            <h1 className="font-serif text-[34px] leading-tight italic md:text-[40px]">{match.primary.name}</h1>
            <p className="label mt-1 text-accent">
              {match.primary.epithet}
              {match.secondary && <span className="text-faint"> · with a streak of {match.secondary.name}</span>}
            </p>
          </div>
        )}
        <p className="max-w-3xl text-[15px] leading-[1.8] text-fg/90">
          {summary(model, "they") ?? "Still forming."}
        </p>
        <Link href="/?route=taste" className="aurora-bg w-fit rounded-full px-5 py-2.5 text-sm font-medium text-bg transition-opacity hover:opacity-85">
          Find your own taste →
        </Link>
      </header>

      {works.length > 0 && (
        <section className="border-b border-line py-14">
          <h2 className="mb-8 font-serif text-[22px]">Works they love</h2>
          <ul className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4">
            {works.map((a) => (
              <li key={a.id}>
                <ArtCard art={a} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-14 py-14 md:grid-cols-2">
        <div>
          <h2 className="label mb-6 text-muted">Epochs</h2>
          <Bars items={epochs} />
        </div>
        <div>
          <h2 className="label mb-6 text-muted">What they look for</h2>
          <Bars items={traits} />
        </div>
      </section>
    </div>
  );
}
