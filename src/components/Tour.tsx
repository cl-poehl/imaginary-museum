"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { yearLabel } from "@/data";
import { ROUTES, ROUTE_ALIASES } from "@/data/tour";
import { exhibitions } from "@/lib/exhibitions";
import { toggleFullscreen } from "@/lib/fullscreen";
import { toggleFavorite, useStored } from "@/lib/store";
import { tooLargeToRead } from "@/lib/museum-layout";
import { buildTour, type Tour as TourData } from "@/lib/tour";

// WebGL only in the browser.
const World3D = dynamic(() => import("./World3D").then((m) => m.World3D), { ssr: false });

const PORTRAIT = "(max-aspect-ratio: 1/1)";
function usePortrait() {
  return useSyncExternalStore(
    (on) => {
      const m = window.matchMedia(PORTRAIT);
      m.addEventListener("change", on);
      return () => m.removeEventListener("change", on);
    },
    () => window.matchMedia(PORTRAIT).matches,
    () => false,
  );
}

/**
 * The guided tours, as one walk through one building. Without a route you
 * stand in the entrance hall before two exhibitions; choosing one walks you
 * through its doorway and on through its rooms. `only` is a one-room tour.
 * The address follows along (?route=…), so Back walks you out again.
 */
export function Tour({ only, seed: initialSeed = 1 }: { only?: string | null; seed?: number }) {
  const router = useRouter();
  const params = useSearchParams();
  // The seed varies the tests per visit; "Walk it again" draws a new one.
  const [seed, setSeed] = useState(initialSeed);

  const halls = useMemo(
    () => (only ? [{ id: only, tour: buildTour({ only, seed }) }] : ROUTES.map((r) => ({ id: r.id, tour: buildTour({ route: r.id, seed }) }))),
    [only, seed],
  );
  const lobby = useMemo(() => (only ? null : exhibitions()), [only]);
  // Links to routes that have since been reorganised open the exhibition that covers them.
  const asked = params.get("route");
  const askedFor = asked ? (ROUTE_ALIASES[asked] ?? asked) : null;
  const active = only ?? (halls.some((h) => h.id === askedFor) ? askedFor : null);
  const tour: TourData | null = halls.find((h) => h.id === active)?.tour ?? null;

  // Where you are in the tour; a new exhibition starts from its first room.
  const [visit, setVisit] = useState({ route: active, index: 0, answers: {} as Record<number, string> });
  if (visit.route !== active) setVisit({ route: active, index: 0, answers: {} });
  const { index, answers } = visit;
  // The hall you started in (opening a tour's link directly).
  const [startIn] = useState(active);

  const go = useCallback(
    (to: number) => setVisit((v) => (tour ? { ...v, index: Math.max(0, Math.min(tour.steps.length - 1, to)) } : v)),
    [tour],
  );
  const enter = useCallback((i: number) => window.history.pushState(null, "", `/tour?route=${ROUTES[i].id}`), []);
  const toLobby = useCallback(() => window.history.pushState(null, "", "/tour"), []);

  // The entrance hall: both doorways, or one (a phone only has room for one at a time).
  const portrait = usePortrait();
  const [chosen, setChosen] = useState(-1);
  const lobbyView = portrait && chosen < 0 ? 0 : chosen;

  const step = tour?.steps[index];
  const room = step && step.kind !== "end" ? tour?.rooms[step.room] : null;

  // Standing back to take in a work and its label; Z steps up close to its subject and back.
  const [close, setClose] = useState({ key: "", close: false });
  const isWork = step?.kind === "work";
  const closeKey = `${active}:${index}`;
  const toggleClose = useCallback(() => isWork && setClose((c) => ({ key: closeKey, close: c.key === closeKey ? !c.close : true })), [isWork, closeKey]);
  const isClose = close.key === closeKey && close.close;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const leave = e.key === "Escape" && !document.fullscreenElement; // in full screen, Esc leaves full screen
      if (e.key === "f" || e.key === "F") toggleFullscreen();
      else if (tour) {
        if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") go(index + 1);
        else if (e.key === "ArrowLeft") go(index - 1);
        else if (e.key === "z" || e.key === "Z") toggleClose();
        else if (leave) router.push("/");
        else return;
      } else {
        // Left and right step between the doorways, from the middle of the foyer outward.
        if (e.key === "ArrowLeft") setChosen(Math.max(0, (lobbyView < 0 ? 1 : lobbyView) - 1));
        else if (e.key === "ArrowRight") setChosen(Math.min(halls.length - 1, (lobbyView < 0 ? 1 : lobbyView) + 1));
        else if ((e.key === "Enter" || e.key === " ") && lobbyView >= 0) enter(lobbyView);
        else if (leave && lobbyView >= 0 && !portrait) setChosen(-1);
        else if (leave) router.push("/");
        else return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tour, go, index, toggleClose, router, lobbyView, portrait, enter, halls.length]);

  // Only tests the visitor actually answered count toward the score.
  const answered = tour ? tour.steps.map((s, i) => [s, i] as const).filter(([s, i]) => s.kind === "quiz" && answers[i]) : [];
  const score = answered.filter(([s, i]) => s.kind === "quiz" && answers[i] === (s.format === "work" ? s.correctId : s.answer)).length;

  const { stored } = useStored();
  const saved = step?.kind === "work" && stored.favorites.includes(step.id);
  const unanswered = step?.kind === "quiz" && !answers[index];

  return (
    <section className="fixed inset-0 z-40 overflow-hidden bg-[#0b0a09]">
      <World3D
        halls={halls}
        lobby={lobby}
        active={active}
        startIn={startIn}
        onLobby={toLobby}
        lobbyView={lobbyView}
        index={index}
        close={isClose}
        onEnter={enter}
        answers={answers}
        onAnswer={(i, choice) => setVisit((v) => (v.answers[i] ? v : { ...v, answers: { ...v.answers, [i]: choice } }))}
        onToggleClose={toggleClose}
        score={{ right: score, total: answered.length }}
        onRestart={() => {
          setSeed(Math.floor(Math.random() * 1e9));
          setVisit({ route: active, index: 0, answers: {} });
        }}
        onFindTaste={() => router.push("/")}
      />

      {/* A whisper of interface: where you are, and the way out. */}
      <div className="label pointer-events-none absolute inset-x-0 top-0 z-30 flex h-9 items-center justify-between gap-4 bg-gradient-to-b from-black/60 to-transparent px-5 whitespace-nowrap text-white/45 md:px-8">
        {/* On a narrow screen the room's name gives way first. */}
        <span className="min-w-0 truncate">
          <span className="font-serif text-[14px] tracking-normal text-white/80 normal-case">Pendant</span>
          <span className="ml-3">
            {tour ? tour.title : "Guided tours"}
            {room && <span className="text-white/30 max-md:hidden"> · {room.info.name}</span>}
          </span>
        </span>
        <span className="pointer-events-auto flex shrink-0 gap-5">
          <button onClick={toggleFullscreen} className="transition-colors hover:text-white max-md:hidden">
            Full screen <span className="text-white/30">F</span>
          </button>
          {tour && !only && (
            <button onClick={toLobby} className="transition-colors hover:text-white">
              Change route
            </button>
          )}
          {!tour && (
            <Link href="/epochs" className="transition-colors hover:text-white max-md:hidden">
              One-room tours
            </Link>
          )}
          <Link href="/" className="transition-colors hover:text-white">
            Leave ✕
          </Link>
        </span>
      </div>

      {/* The few controls a visitor needs; everything to read is on the walls. */}
      <div className="label absolute right-4 bottom-7 z-30 flex items-center gap-1 rounded-full bg-black/45 p-1 whitespace-nowrap text-white/70 backdrop-blur-md max-md:right-1/2 max-md:translate-x-1/2 md:right-6">
        {tour ? (
          <>
            {step?.kind === "work" && (
              <>
                <button onClick={toggleClose} className="rounded-full px-3 py-2 transition-colors hover:text-white">
                  {isClose ? "Step back" : tooLargeToRead(step.id, portrait) ? "Read label" : "Closer"} <span className="text-white/35 max-md:hidden">Z</span>
                </button>
                <button onClick={() => toggleFavorite(step.id)} className={`rounded-full px-3 py-2 transition-colors hover:text-white ${saved ? "text-[#c2ae86]" : ""}`}>
                  {saved ? "Saved" : "Save"}
                </button>
                <span className="mx-1 h-4 w-px bg-white/15" />
              </>
            )}
            <button onClick={() => go(index - 1)} disabled={index === 0} aria-label="Back" className="rounded-full px-3 py-2 transition-colors hover:text-white disabled:opacity-30">
              ←
            </button>
            {index < tour.steps.length - 1 && (
              <button onClick={() => go(index + 1)} className="rounded-full bg-white/90 px-4 py-2 text-[#15130f] transition-colors hover:bg-white">
                {unanswered ? "Skip" : "Walk on"} →
              </button>
            )}
          </>
        ) : lobbyView < 0 ? (
          lobby?.map((ex, i) => (
            <button key={ex.id} onClick={() => enter(i)} className="rounded-full px-3 py-2 transition-colors hover:text-white">
              {ex.name}
            </button>
          ))
        ) : (
          <>
            <button
              onClick={() => setChosen(portrait ? (lobbyView + 1) % halls.length : -1)}
              className="rounded-full px-3 py-2 transition-colors hover:text-white"
            >
              {portrait ? "Next exhibition" : "← All exhibitions"}
            </button>
            <button onClick={() => enter(lobbyView)} className="rounded-full bg-white/90 px-4 py-2 text-[#15130f] transition-colors hover:bg-white">
              Enter →
            </button>
          </>
        )}
      </div>

      {tour && (
        <div className="absolute inset-x-0 bottom-0 z-30 px-3 pb-1.5 md:px-5">
          <Timeline tour={tour} index={index} onJump={go} />
        </div>
      )}

      {/* The same choice for screen readers and without WebGL. */}
      {!tour && lobby && (
        <nav className="sr-only">
          <h1>Where shall we begin?</h1>
          <ul>
            {lobby.map((ex) => (
              <li key={ex.id}>
                <a href={`/tour?route=${ex.id}`}>
                  {ex.name}, {ex.span}. {ex.description}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </section>
  );
}

/* --------------------------------------------------------------- timeline */

function Timeline({ tour, index, onJump }: { tour: TourData; index: number; onJump: (i: number) => void }) {
  const current = tour.steps[index];
  const currentRoom = current.kind === "end" ? tour.rooms.length : current.room;
  const firstStep = (room: number) => tour.steps.findIndex((s) => s.kind === "room" && s.room === room);
  const inRoom = tour.steps.filter((s) => s.kind !== "end" && s.room === currentRoom).length;
  const done = tour.steps.slice(0, index).filter((s) => s.kind !== "end" && s.room === currentRoom).length;

  if (tour.rooms.length === 1) {
    return (
      <div className="h-[2px] w-full bg-white/10">
        <div className="h-full bg-[#c2ae86] transition-all duration-700" style={{ width: `${(index / (tour.steps.length - 1)) * 100}%` }} />
      </div>
    );
  }

  return (
    <ol className="flex gap-[3px]">
      {tour.rooms.map((r, i) => (
        <li key={r.movement} className="group relative flex-1">
          <button onClick={() => onJump(firstStep(i))} className="block w-full py-1.5" title={`${r.info.name} · ${yearLabel(r.info.start)}`}>
            <span className="block h-[2px] w-full overflow-hidden bg-white/10">
              <span
                className="block h-full bg-[#c2ae86] transition-all duration-700"
                style={{ width: i < currentRoom ? "100%" : i === currentRoom ? `${((done + 1) / Math.max(inRoom, 1)) * 100}%` : "0%" }}
              />
            </span>
          </button>
          <span className="label pointer-events-none absolute bottom-4 left-0 whitespace-nowrap text-white/50 opacity-0 transition-opacity group-hover:opacity-100 max-md:hidden">
            {r.info.name}
          </span>
        </li>
      ))}
    </ol>
  );
}
