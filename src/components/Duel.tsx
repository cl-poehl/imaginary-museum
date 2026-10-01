"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { getArtist, getArtwork, getMovement, type Artwork } from "@/data";
import { startOver, toggleFavorite, useStored, writeStored } from "@/lib/store";
import { confidence, insightFor, nextPair, train, type Choice, type Verdict } from "@/lib/taste";
import { Intro } from "./Intro";
import { LitArtwork } from "./LitArtwork";
import { toggleFullscreen } from "@/lib/fullscreen";
import { Lightbox } from "./Lightbox";

type PanelState = "idle" | "won" | "lost" | "both" | "neither";

export function Duel() {
  const { stored, model, ready } = useStored();
  const [outcome, setOutcome] = useState<{ winner: string | null; verdict?: Verdict } | null>(null);
  const [insight, setInsight] = useState<{ text: string; key: number } | null>(null);
  const [zoomed, setZoomed] = useState<string | null>(null);
  const [intro, setIntro] = useState(false);
  const busy = useRef(false);
  const showIntro = ready && (intro || !stored.introSeen);

  const pair = stored.current;
  const captions = stored.captions;

  // First visit: nothing stored yet, so seed the opening pair.
  useEffect(() => {
    if (ready && !stored.current) writeStored({ current: nextPair(stored.history, model) });
  }, [ready, stored, model]);

  const decide = useCallback(
    (winner: string | null, verdict?: Verdict) => {
      if (!pair || busy.current) return;
      busy.current = true;
      const choice: Choice = { a: pair[0], b: pair[1], winner, verdict, at: Date.now() };
      const history = [...stored.history, choice];
      const nextModel = train(history, stored.favorites);
      const informative = Boolean(winner || verdict);
      if (informative) {
        setOutcome({ winner, verdict });
        const text = insightFor(choice, nextModel);
        setInsight(text ? { text, key: history.length } : null);
      }
      window.setTimeout(
        () => {
          writeStored({ history, current: nextPair(history, nextModel) });
          setOutcome(null);
          busy.current = false;
        },
        informative ? 520 : 0,
      );
    },
    [pair, stored.history, stored.favorites],
  );

  const undo = useCallback(() => {
    const last = stored.history.at(-1);
    if (!last || busy.current) return;
    writeStored({ history: stored.history.slice(0, -1), current: [last.a, last.b] });
    setInsight(null);
  }, [stored.history]);

  const toggleCaptions = useCallback(() => writeStored({ captions: !captions }), [captions]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || !pair || zoomed || showIntro) return;
      if (e.target instanceof Element && e.target.closest("input, textarea")) return;
      if (e.key === "ArrowLeft") decide(pair[0]);
      else if (e.key === "ArrowRight") decide(pair[1]);
      else if (e.key === "ArrowUp") decide(null, "both");
      else if (e.key === "ArrowDown") decide(null, "neither");
      else if (e.key === " " || e.key === "s") decide(null);
      else if (e.key === "u" || e.key === "Backspace") undo();
      else if (e.key === "i") toggleCaptions();
      else if (e.key === "f") toggleFullscreen();
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pair, decide, undo, toggleCaptions, zoomed, showIntro]);

  const enter = useCallback(() => {
    writeStored({ introSeen: true });
    setIntro(false);
  }, []);

  const restart = () => {
    if (window.confirm("Start over? This clears your picks and saved works.")) {
      startOver();
      setInsight(null);
    }
  };

  if (showIntro) return <Intro onEnter={enter} />;

  const left = pair && getArtwork(pair[0]);
  const right = pair && getArtwork(pair[1]);
  const signal = Math.round(confidence(model) * 100);

  const stateOf = (id: string): PanelState => {
    if (!outcome) return "idle";
    if (outcome.verdict) return outcome.verdict;
    return outcome.winner === id ? "won" : "lost";
  };

  return (
    <section className="flex h-[calc(100dvh-var(--header-h))] flex-col">
      {/* Works share one row and labels another, so the pair always hangs level. */}
      <div className="relative grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] md:grid-cols-2 md:grid-rows-[minmax(0,1fr)_auto]">
        {left && right ? (
          <>
            <Panel
              key={left.id}
              column={1}
              art={left}
              state={stateOf(left.id)}
              captions={captions}
              saved={stored.favorites.includes(left.id)}
              onChoose={() => decide(left.id)}
              onZoom={() => setZoomed(left.id)}
            />
            <Panel
              key={right.id}
              column={2}
              art={right}
              state={stateOf(right.id)}
              captions={captions}
              saved={stored.favorites.includes(right.id)}
              onChoose={() => decide(right.id)}
              onZoom={() => setZoomed(right.id)}
            />
          </>
        ) : (
          <>
            <div className="shimmer m-8 rounded-[1px] md:row-span-2" />
            <div className="shimmer m-8 rounded-[1px] md:row-span-2" />
          </>
        )}
      </div>

      <footer className="label grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 pt-1 pb-3 text-faint md:px-8">
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline">No. {stored.history.length + 1}</span>
          <span title="How much your curator has learned about your taste">
            Taste <span className="text-muted tabular-nums">{signal}%</span>
          </span>
          {model.decided >= 5 && (
            <Link href="/taste" className="hidden text-accent transition-opacity hover:opacity-70 sm:inline">
              Your matches
            </Link>
          )}
        </div>

        <div className="flex items-center justify-center gap-4 whitespace-nowrap">
          {insight && !outcome ? (
            <span key={insight.key} className="rise hidden normal-case tracking-normal lg:inline">
              <span className="font-serif text-[13px] text-accent italic">{insight.text}</span>
            </span>
          ) : (
            <span className="hidden lg:inline">← → choose</span>
          )}
          <FootButton onClick={() => decide(null, "both")} hint="↑">
            Both
          </FootButton>
          <FootButton onClick={() => decide(null, "neither")} hint="↓">
            Neither
          </FootButton>
          <FootButton onClick={() => decide(null)} hint="Space">
            Skip
          </FootButton>
        </div>

        <div className="flex items-center justify-end gap-4">
          <FootButton onClick={toggleCaptions} hint="I" dim={!captions}>
            Labels
          </FootButton>
          <FootButton onClick={undo} hint="U" disabled={stored.history.length === 0}>
            Undo
          </FootButton>
          <FootButton onClick={toggleFullscreen} hint="F" className="hidden md:inline">
            Full screen
          </FootButton>
          <FootButton onClick={() => setIntro(true)} hint="How it works" className="hidden lg:inline">
            How it works
          </FootButton>
          <button
            onClick={restart}
            className="border border-line px-2.5 py-1 text-muted transition-colors hover:border-fg/60 hover:text-fg"
          >
            Start over
          </button>
        </div>
      </footer>

      {zoomed && <Lightbox id={zoomed} onClose={() => setZoomed(null)} />}
    </section>
  );
}

function Panel({
  art,
  column,
  state,
  captions,
  saved,
  onChoose,
  onZoom,
}: {
  art: Artwork;
  column: 1 | 2;
  state: PanelState;
  captions: boolean;
  saved: boolean;
  onChoose: () => void;
  onZoom: () => void;
}) {
  const artist = getArtist(art.artist)!;
  const movement = getMovement(art.movement)!;
  const positive = state === "won" || state === "both";
  const negative = state === "lost" || state === "neither";
  const place = column === 1 ? "md:col-start-1" : "md:col-start-2";
  // Edge to edge: the only space is a hairline between the two works.
  const gutter = column === 1 ? "pb-[3px] md:pr-[3px] md:pb-0" : "pt-[3px] md:pl-[3px] md:pt-0";
  const fade = `transition-opacity duration-500 ${negative ? "opacity-10" : ""}`;

  return (
    <>
      <button
        onClick={onChoose}
        aria-label={`Choose ${art.title} by ${artist.name}`}
        className={`reveal relative min-h-0 cursor-pointer outline-none md:row-start-1 ${gutter} ${place} ${fade}`}
      >
        <LitArtwork art={art} alt={`${art.title}, ${artist.name}`} light={positive ? 1.6 : 1} />
        {positive && (
          <span className="label absolute bottom-3 left-1/2 -translate-x-1/2 bg-bg/80 px-2 py-0.5 text-accent backdrop-blur">Chosen</span>
        )}
      </button>

      <div className={`min-w-0 md:row-start-2 ${place} ${fade}`}>
        {captions ? (
          <WallLabel art={art} artist={artist} movementName={movement.name} saved={saved} onZoom={onZoom} />
        ) : (
          <p className="mx-auto max-w-full truncate px-5 pt-1.5 pb-1 text-center text-[10.5px] tracking-wide text-faint">
            <span className="text-muted">{artist.name}</span>
            <span className="mx-1.5">·</span>
            <span className="font-serif text-[12px] text-muted italic">{art.title}</span>
            <span className="mx-1.5">·</span>
            {art.year}
            <span className="mx-1.5 hidden md:inline">·</span>
            <span className="hidden md:inline">{art.medium}</span>
            <span className="mx-1.5 hidden lg:inline">·</span>
            <span className="hidden lg:inline">{art.collection}</span>
          </p>
        )}
      </div>
    </>
  );
}

/** A museum wall label: artist, dates, title, medium, collection, then the text. */
function WallLabel({
  art,
  artist,
  movementName,
  saved,
  onZoom,
}: {
  art: Artwork;
  artist: NonNullable<ReturnType<typeof getArtist>>;
  movementName: string;
  saved: boolean;
  onZoom: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-[34rem] px-5 pt-3 pb-3 md:px-6">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[12px] text-fg">
          <Link href={`/artists/${artist.id}`} className="hover:underline">
            {artist.name}
          </Link>
          {artist.lifespan && (
            <span className="text-faint">
              {" "}
              {artist.nationality ? `${artist.nationality}, ` : ""}
              {artist.lifespan}
            </span>
          )}
        </p>
        <Link href={`/epochs/${art.movement}`} className="label shrink-0 text-faint transition-colors hover:text-muted">
          {movementName}
        </Link>
      </div>
      <p className="mt-0.5 font-serif text-[15px] leading-snug text-fg">
        <span className="italic">{art.title}</span>
        <span className="text-muted">, {art.year}</span>
      </p>
      <p className="mt-0.5 text-[10.5px] leading-relaxed text-faint">
        {[art.medium, art.dimensions, art.collection].filter(Boolean).join(" · ")}
      </p>
      {art.blurb && <p className="mt-2 hidden text-[12px] leading-[1.6] text-muted md:block">{art.blurb}</p>}
      <div className="label mt-2 flex gap-4 text-faint">
        <button onClick={() => toggleFavorite(art.id)} className={`transition-colors hover:text-fg ${saved ? "text-accent" : ""}`} aria-pressed={saved}>
          {saved ? "Saved" : "Save"}
        </button>
        <button onClick={onZoom} className="transition-colors hover:text-fg">
          View
        </button>
        <Link href={`/works/${art.id}`} className="transition-colors hover:text-fg">
          More
        </Link>
      </div>
    </div>
  );
}

function FootButton({
  children,
  hint,
  onClick,
  disabled,
  dim,
  className = "",
}: {
  children: React.ReactNode;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
  dim?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={`Shortcut: ${hint}`}
      className={`transition-colors hover:text-fg disabled:opacity-30 disabled:hover:text-faint ${dim ? "text-faint/60" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

export function Heart({ filled }: { filled: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.3">
      <path d="M8 14s-5.5-3.4-5.5-7.4A3 3 0 0 1 8 4.5a3 3 0 0 1 5.5 2.1C13.5 10.6 8 14 8 14Z" strokeLinejoin="round" />
    </svg>
  );
}
