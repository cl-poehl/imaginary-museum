// A room for one visitor, through its own doorway off the entrance hall: the
// works the taste model thinks they will love most (each labelled with the
// choice that led to it), then the works they saved. It opens once the museum
// has learned enough to choose (UNLOCK choices in the taste room).

import { artworks, getArtwork, type Artwork, type Movement } from "@/data";
import { features, leanings, score, summary, train, type Choice } from "@/lib/taste";
import type { Step, Tour } from "@/lib/tour";

/** The route id of the visitor's own room (?route=yours). */
export const YOURS = "yours";
/** Choices (and saved works) the museum needs before it can hang a room for you. */
export const UNLOCK = 8;

const CHOSEN = 8; // works chosen for the visitor: half of them stops, half between
const SAVED = 12; // saved works hung at most
const STOPS = 4; // works per room with a full label

type Vector = Map<string, number>;
const vectorOf = (a: Artwork): Vector => new Map(features(a));
function cosine(a: Vector, b: Vector) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const [f, v] of a) {
    na += v * v;
    dot += v * (b.get(f) ?? 0);
  }
  for (const v of b.values()) nb += v * v;
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** How far along the visitor is: choices made toward UNLOCK. */
export function progressToRoom(history: Choice[], favorites: string[]) {
  return train(history, favorites).decided;
}

export function buildPersonalTour(history: Choice[], favorites: string[]): Tour | null {
  const model = train(history, favorites);
  if (model.decided < UNLOCK) return null;

  // What the visitor has liked: picked over another, liked both, or saved.
  const liked = new Set<string>(favorites);
  for (const c of history) {
    if (c.winner) liked.add(c.winner);
    else if (c.verdict === "both") [c.a, c.b].forEach((id) => liked.add(id));
  }
  const shown = new Set(history.flatMap((c) => [c.a, c.b]));
  const likedVectors = [...liked].map((id) => getArtwork(id)).filter((a): a is Artwork => Boolean(a)).map((a) => ({ a, v: vectorOf(a) }));

  // The works the model rates highest, ones not yet seen a little ahead, no more
  // than one per artist and two per epoch, so the room isn't one painter's.
  const ranked = artworks
    .filter((a) => !liked.has(a.id))
    .map((a) => ({ a, s: score(a.id, model.weights) + (shown.has(a.id) ? 0 : 0.3) }))
    .sort((x, y) => y.s - x.s);
  const perArtist = new Map<string, number>();
  const perEpoch = new Map<string, number>();
  const chosen: Artwork[] = [];
  for (const { a } of ranked) {
    const who = a.artist ?? a.culture ?? a.id;
    if ((perArtist.get(who) ?? 0) >= 1 || (perEpoch.get(a.movement) ?? 0) >= 2) continue;
    perArtist.set(who, (perArtist.get(who) ?? 0) + 1);
    perEpoch.set(a.movement, (perEpoch.get(a.movement) ?? 0) + 1);
    chosen.push(a);
    if (chosen.length === CHOSEN) break;
  }

  // Each chosen work's reason: the liked work most like it.
  const notes: Record<string, string> = {};
  for (const a of chosen) {
    const v = vectorOf(a);
    const best = likedVectors.reduce<{ a: Artwork; sim: number } | null>((top, l) => {
      const sim = cosine(v, l.v);
      return !top || sim > top.sim ? { a: l.a, sim } : top;
    }, null);
    if (best) notes[a.id] = `Because you chose ${best.a.title}`;
  }

  const saved = [...favorites].reverse().map((id) => getArtwork(id)).filter((a): a is Artwork => Boolean(a)).slice(0, SAVED);
  const span = (works: Artwork[]) => ({ start: Math.min(...works.map((w) => w.date)), end: Math.max(...works.map((w) => w.date)) });
  const loves = leanings(model, "t")
    .filter((l) => l.weight > 0.1)
    .slice(0, 3)
    .map((l) => cap(l.label));

  const rooms: { works: Artwork[]; info: Movement }[] = [
    {
      works: chosen,
      info: {
        id: "chosen-for-you",
        name: "Chosen for you",
        ...span(chosen),
        region: "Made for you",
        summary: summary(model) ?? "Works the museum thinks you will love, from what you have chosen so far.",
        hallmarks: loves,
        wiki: "",
      },
    },
  ];
  if (saved.length)
    rooms.push({
      works: saved,
      info: {
        id: "your-collection",
        name: "Your collection",
        ...span(saved),
        region: "Saved by you",
        summary: "The works you saved, hung together. Save any work in the museum and it joins them here.",
        hallmarks: [],
        wiki: "",
      },
    });

  const steps: Step[] = [];
  const extras: string[][] = [];
  rooms.forEach((r, i) => {
    steps.push({ kind: "room", room: i });
    for (const w of r.works.slice(0, STOPS)) steps.push({ kind: "work", room: i, id: w.id });
    extras.push(r.works.slice(STOPS).map((w) => w.id));
  });
  steps.push({ kind: "end" });

  return {
    title: "Your Own Room",
    rooms: rooms.map((r) => ({ movement: r.info.id, info: r.info })),
    steps,
    extras,
    notes,
    personal: true,
  };
}
