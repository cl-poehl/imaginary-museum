"use client";

import Link from "next/link";
import { useState } from "react";
import { artworks, getArtist, getArtwork, thumb, TRAIT_GROUPS, TRAITS, type TraitGroup } from "@/data";
import { encodeShare } from "@/lib/share";
import { startOver, useStored, type Stored } from "@/lib/store";
import { evidence, matchArchetype, profileText } from "@/lib/archetype";
import { confidence, fit, leanings, type Lean, type Model } from "@/lib/taste";
import { whyFor } from "@/lib/why";
import { ArtCard } from "./ArtworkGrid";

export function TasteProfile() {
  const { stored, model, ready } = useStored();
  const enough = ready && model.decided >= 3;

  if (!ready) return <div className="h-96" />;

  if (!enough) {
    return (
      <div className="flex flex-col items-start gap-6 pt-24">
        <h1 className="font-serif text-[34px] leading-tight">Not enough to go on yet</h1>
        <p className="max-w-md text-muted">
          Your curator learns from the pairs you choose between. A handful of picks is enough for a first read.
        </p>
        <Link href="/?route=taste" className="label border border-fg/60 px-6 py-3 text-fg transition-colors hover:bg-fg hover:text-bg">
          Start choosing
        </Link>
      </div>
    );
  }

  const shown = new Set(stored.history.flatMap((c) => [c.a, c.b]));
  const chosen = new Set([...stored.history.map((c) => c.winner).filter(Boolean), ...stored.favorites]);
  const ranked = artworks.map((a) => ({ a, fit: fit(a.id, model) })).sort((x, y) => y.fit - x.fit);
  const unseen = ranked.filter((r) => !shown.has(r.a.id)).slice(0, 8);
  const best = ranked.filter((r) => chosen.has(r.a.id)).slice(0, 4);

  const traitLeans = leanings(model, "t");
  const epochLeans = leanings(model, "m").filter((l) => Math.abs(l.weight) > 0.02);
  const mediaLeans = leanings(model, "k").filter((l) => Math.abs(l.weight) > 0.02);
  const artistLeans = leanings(model, "a").filter((l) => l.weight > 0.05).slice(0, 5);
  const groups = Object.keys(TRAIT_GROUPS) as TraitGroup[];
  const signal = Math.round(confidence(model) * 100);
  const match = matchArchetype(model);
  const heading =
    match.strength === "clear" ? "You are" : match.strength === "emerging" ? "Taking shape" : "So far";

  return (
    <div className="flex flex-col">
      <header className="grid gap-10 border-b border-line pt-12 pb-10 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-8">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <h1 className="font-serif text-[34px] leading-tight md:text-[40px]">Your taste</h1>
            <p className="label text-muted">
              {model.decided} signals · <span className="text-accent">{signal}% confident</span>
            </p>
          </div>
          <div className="max-w-2xl border-l border-accent/40 pl-6">
            <p className="label text-faint">{heading}</p>
            <h2 className="mt-1 font-serif text-[30px] leading-tight italic">{match.primary.name}</h2>
            <p className="label mt-1 text-accent">{match.primary.epithet}</p>
            <p className="mt-5 text-[14px] leading-[1.8] text-fg/90">{profileText(match)}</p>
            {evidence(match, stored) && <p className="mt-3 text-[13px] leading-relaxed text-muted">{evidence(match, stored)}</p>}
            {artistLeans.length > 0 && (
              <p className="mt-4 text-[12.5px] text-muted">
                Artists you keep choosing:{" "}
                {artistLeans.map((l, i) => (
                  <span key={l.feature}>
                    {i > 0 && ", "}
                    <Link href={`/artists/${l.feature.slice(2)}`} className="text-fg hover:underline">
                      {getArtist(l.feature.slice(2))?.name}
                    </Link>
                  </span>
                ))}
                .
              </p>
            )}
            {match.strength !== "clear" && (
              <p className="mt-3 text-[11.5px] text-faint">A few more picks will sharpen this.</p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <ShareCard encoded={encodeShare(model, stored)} />
          <StartOverButton />
        </div>
      </header>

      {unseen.length > 0 && (
        <section className="border-b border-line py-14">
          <SectionTitle title="Waiting for you" note="Works you haven't seen yet, ranked by how well they fit." />
          <ul className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4">
            {unseen.map(({ a, fit }) => (
              <li key={a.id}>
                <ArtCard art={a} badge={<FitBadge value={fit} />}>
                  <WhyThis artworkId={a.id} model={model} stored={stored} />
                </ArtCard>
              </li>
            ))}
          </ul>
        </section>
      )}

      {best.length > 0 && (
        <section className="border-b border-line py-14">
          <SectionTitle title="Your strongest picks" />
          <ul className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4">
            {best.map(({ a, fit }) => (
              <li key={a.id}>
                <ArtCard art={a} badge={<FitBadge value={fit} />} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-14 border-b border-line py-14 md:grid-cols-2">
        <div className="flex flex-col gap-10">
          <div>
            <h2 className="label mb-6 text-muted">Epochs</h2>
            <Bars items={epochLeans} href={(l) => `/epochs/${l.feature.slice(2)}`} />
          </div>
          {mediaLeans.length > 0 && (
            <div>
              <h2 className="label mb-6 text-muted">Media</h2>
              <Bars items={mediaLeans} />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-8">
          {groups.map((g) => {
            const items = traitLeans.filter((l) => TRAITS[l.feature.slice(2)]?.group === g && Math.abs(l.weight) > 0.02);
            if (!items.length) return null;
            return (
              <div key={g}>
                <h2 className="label mb-4 text-muted">{TRAIT_GROUPS[g]}</h2>
                <Bars items={items} />
              </div>
            );
          })}
        </div>
      </section>

      <section className="py-14">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="label text-muted">Recent picks</h2>
          <button
            onClick={() => {
              if (window.confirm("Clear all your picks and saved works, and start over?")) startOver();
            }}
            className="label text-faint transition-colors hover:text-fg"
          >
            Start over
          </button>
        </div>
        <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {stored.history
            .slice(-12)
            .reverse()
            .map((c) => (
              <li key={c.at} className="flex items-center gap-3 text-sm">
                {[c.a, c.b].map((id) => {
                  const art = getArtwork(id)!;
                  const won = c.winner === id || c.verdict === "both";
                  const lost = (c.winner && c.winner !== id) || c.verdict === "neither";
                  return (
                    <Link
                      key={id}
                      href={`/works/${id}`}
                      title={art.title}
                      className={`flex min-w-0 flex-1 items-center gap-2.5 ${lost ? "opacity-35" : ""}`}
                    >
                      <img src={thumb(art.image)} alt="" className="size-9 shrink-0 rounded-sm object-cover" />
                      <span className={`truncate ${won ? "text-fg" : "text-muted"}`}>{art.title}</span>
                    </Link>
                  );
                })}
                <span className="label w-14 shrink-0 text-right text-faint">
                  {c.verdict ?? (c.winner ? "" : "skip")}
                </span>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}

function SectionTitle({ title, note }: { title: string; note?: string }) {
  return (
    <div className="mb-8">
      <h2 className="font-serif text-[22px]">{title}</h2>
      {note && <p className="mt-1.5 text-sm text-muted">{note}</p>}
    </div>
  );
}

function FitBadge({ value }: { value: number }) {
  return (
    <span className="rounded-full bg-bg/80 px-2 py-0.5 font-mono text-[11px] tabular-nums backdrop-blur">
      <span className="aurora-text">{value}%</span>
    </span>
  );
}

/** The model's own reasons for a recommendation: no AI call, nothing invented. */
function WhyThis({ artworkId, model, stored }: { artworkId: string; model: Model; stored: Stored }) {
  const { reasons, resembles } = whyFor(artworkId, model, stored);
  if (!reasons.length && !resembles) return null;
  return (
    <div className="mt-2 text-[11.5px] leading-relaxed text-muted">
      {reasons.length > 0 && (
        <p>
          <span className="first-letter:uppercase">{reasons.join("; ")}</span>.
        </p>
      )}
      {resembles && (
        <p className="mt-0.5 text-faint">
          Looks closest to{" "}
          <Link href={`/works/${resembles.id}`} className="italic hover:text-fg">
            {resembles.title}
          </Link>
          , which you chose.
        </p>
      )}
    </div>
  );
}

function ShareCard({ encoded }: { encoded: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <aside className="flex h-fit flex-col gap-4 rounded-lg border border-line bg-panel/60 p-6">
      <p className="label text-muted">Share your taste</p>
      <p className="text-sm text-muted">A read-only card of your profile and saved works. Nothing is uploaded; it all lives in the link.</p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={async () => {
            const url = `${window.location.origin}/shared?p=${encoded}`;
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1800);
            } catch {
              window.prompt("Copy this link", url);
            }
          }}
          className="aurora-bg rounded-full px-4 py-2 text-xs font-medium text-bg transition-opacity hover:opacity-85"
        >
          {copied ? "Link copied" : "Copy share link"}
        </button>
        <Link href={`/shared?p=${encoded}`} className="rounded-full border border-line px-4 py-2 text-xs text-muted transition-colors hover:text-fg">
          Preview
        </Link>
      </div>
      <Link href="/collection" className="text-xs text-muted transition-colors hover:text-fg">
        Your saved collection →
      </Link>
    </aside>
  );
}

export function Bars({ items, href }: { items: Lean[]; href?: (l: Lean) => string }) {
  const max = Math.max(0.4, ...items.map((l) => Math.abs(l.weight)));
  return (
    <ul className="flex flex-col gap-2">
      {items.map((l) => {
        const w = (Math.abs(l.weight) / max) * 50;
        const label = href ? (
          <Link href={href(l)} className="link">
            {l.label}
          </Link>
        ) : (
          l.label
        );
        return (
          <li key={l.feature} className="grid grid-cols-[minmax(0,11rem)_1fr] items-center gap-4 text-sm">
            <span className="truncate first-letter:uppercase">{label}</span>
            <span className="relative h-1.5">
              <span className="absolute inset-y-[-4px] left-1/2 w-px bg-line" />
              <span
                className={`absolute inset-y-0 rounded-full ${l.weight >= 0 ? "aurora-bg" : "bg-white/15"}`}
                style={l.weight >= 0 ? { left: "50%", width: `${w}%` } : { right: "50%", width: `${w}%` }}
              />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function StartOverButton() {
  return (
    <button
      onClick={() => {
        if (window.confirm("Clear all your picks and saved works, and start over?")) startOver();
      }}
      className="label w-full border border-fg/60 px-5 py-3 text-fg transition-colors hover:bg-fg hover:text-bg"
    >
      Start over
    </button>
  );
}
