"use client";

// The museum's plan, folded out over the view (M): every exhibition, room and
// work, each a step away, and a search across them all. Works the tours don't
// show are found too, and open on their own page.

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { artworks, getArtist, getArtwork, yearLabel, type Artwork } from "@/data";
import type { Tour } from "@/lib/tour";

type Hall = { id: string; tour: Tour };
/** Where a work hangs: which exhibition, which stop (or which room, for one between the stops). */
type Spot = { route: string; index: number; focus?: string; room: string; exhibition: string };

export function MuseumMap({
  halls,
  active,
  onGo,
  onLobby,
  onTaste,
  onClose,
}: {
  halls: Hall[];
  active: string | null;
  onGo: (route: string, index: number, focus?: string) => void;
  onLobby: () => void;
  onTaste: () => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  // Ready to type as soon as the map opens (on a computer; a phone would pop its keyboard up).
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) input.current?.focus();
  }, []);

  // Every work on the walls, and where it hangs.
  const spots = useMemo(() => {
    const map = new Map<string, Spot>();
    for (const h of halls) {
      h.tour.steps.forEach((s, i) => {
        if (s.kind === "work" && !map.has(s.id))
          map.set(s.id, { route: h.id, index: i, room: h.tour.rooms[s.room].info.name, exhibition: h.tour.title });
      });
      h.tour.extras.forEach((ids, room) => {
        const index = h.tour.steps.findIndex((s) => s.kind === "room" && s.room === room);
        for (const id of ids)
          if (!map.has(id)) map.set(id, { route: h.id, index, focus: id, room: h.tour.rooms[room].info.name, exhibition: h.tour.title });
      });
    }
    return map;
  }, [halls]);

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (q.length < 2) return [];
    const match = (a: Artwork) =>
      a.title.toLowerCase().includes(q) || (getArtist(a.artist)?.name ?? a.culture ?? "").toLowerCase().includes(q) || a.movement.includes(q.replace(/ /g, "-"));
    return artworks.filter(match).slice(0, 30);
  }, [q]);

  const go = (s: Spot) => {
    onGo(s.route, s.index, s.focus);
    onClose();
  };

  return (
    <div className="absolute inset-y-0 right-0 z-40 flex w-[min(24rem,100vw)] flex-col bg-[#0e0d0b]/95 text-white/80 shadow-2xl backdrop-blur-md" role="dialog" aria-label="Map of the museum">
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <p className="label text-white/45">The museum</p>
        <button onClick={onClose} className="label text-white/45 transition-colors hover:text-white" aria-label="Close the map">
          Close <span className="text-white/30">M</span>
        </button>
      </div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        ref={input}
        placeholder="Find a work, artist or room"
        className="mx-5 mb-3 border-b border-white/15 bg-transparent pb-2 text-[15px] text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none"
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
        {q.length >= 2 ? (
          <ul className="flex flex-col gap-1">
            {results.length === 0 && <li className="text-[13px] text-white/40">Nothing by that name.</li>}
            {results.map((a) => {
              const spot = spots.get(a.id);
              const by = getArtist(a.artist)?.name ?? a.culture;
              const text = (
                <>
                  <span className="font-serif text-[16px] italic">{a.title}</span>
                  <span className="block text-[12px] text-white/45">
                    {by} · {a.year}
                    {spot ? ` · ${spot.room}, ${spot.exhibition}` : " · not in the tours: open its page"}
                  </span>
                </>
              );
              return (
                <li key={a.id}>
                  {spot ? (
                    <button onClick={() => go(spot)} className="w-full py-1.5 text-left transition-colors hover:text-white">
                      {text}
                    </button>
                  ) : (
                    <Link href={`/works/${a.id}`} className="block py-1.5 transition-colors hover:text-white">
                      {text}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <button onClick={() => (onLobby(), onClose())} className="text-left font-serif text-[18px] transition-colors hover:text-white">
                The entrance hall
              </button>
              <button onClick={() => (onTaste(), onClose())} className="text-left font-serif text-[18px] text-[#c2ae86] italic transition-colors hover:text-white">
                The Taste Room
              </button>
            </div>
            {halls.map((h) => (
              <section key={h.id}>
                <button
                  onClick={() => go({ route: h.id, index: 0, room: "", exhibition: h.tour.title })}
                  className={`text-left font-serif text-[20px] italic transition-colors hover:text-white ${h.id === active ? "text-white" : ""}`}
                >
                  {h.tour.title}
                </button>
                <ol className="mt-2 flex flex-col gap-3 border-l border-white/10 pl-4">
                  {h.tour.rooms.map((r, i) => {
                    const start = h.tour.steps.findIndex((s) => s.kind === "room" && s.room === i);
                    const works = [
                      ...h.tour.steps.flatMap((s, index) => (s.kind === "work" && s.room === i ? [{ id: s.id, index, focus: undefined }] : [])),
                      ...h.tour.extras[i].map((id) => ({ id, index: start, focus: id })),
                    ].filter((w, n, all) => all.findIndex((x) => x.id === w.id) === n);
                    return (
                      <li key={r.movement}>
                        <button
                          onClick={() => go({ route: h.id, index: start, room: r.info.name, exhibition: h.tour.title })}
                          className="label text-left text-white/55 transition-colors hover:text-white"
                        >
                          {r.info.name} <span className="text-white/30">· {yearLabel(r.info.start)}</span>
                        </button>
                        <ul className="mt-1 flex flex-col">
                          {works.map((w) => (
                            <li key={w.id}>
                              <button
                                onClick={() => go({ route: h.id, index: w.index, focus: w.focus, room: r.info.name, exhibition: h.tour.title })}
                                className="text-left text-[13px] text-white/60 transition-colors hover:text-white"
                              >
                                {getArtwork(w.id)?.title}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
          </div>
        )}
      </div>
      <div className="label flex gap-5 px-5 pt-2 pb-4 text-white/30">
        <Link href="/taste" className="transition-colors hover:text-white">
          Your taste
        </Link>
        <Link href="/privacy" className="transition-colors hover:text-white">
          Privacy
        </Link>
      </div>
    </div>
  );
}
