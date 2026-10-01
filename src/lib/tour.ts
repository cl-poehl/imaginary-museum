// Turns the tour route into a sequence of steps the player walks through.

import { getArtwork, getMovement, worksInMovement, type Artwork, type Movement } from "@/data";
import { GRAND_TOUR, ROUTES, WORKS_PER_ROOM, type TourRoom } from "@/data/tour";

/**
 * Two kinds of test, drawn at random so there's no pattern to learn:
 * "room": one unseen work, pick the room it belongs in;
 * "work": three unseen works from different rooms, pick the one from the named room.
 */
export type Quiz =
  | { kind: "quiz"; format: "room"; room: number; answer: string; id: string; options: string[] }
  | { kind: "quiz"; format: "work"; room: number; answer: string; ids: string[]; correctId: string };

export type Step =
  | { kind: "room"; room: number }
  | { kind: "work"; room: number; id: string }
  | Quiz
  | { kind: "bridge"; room: number; text: string }
  | { kind: "end" };

export type Tour = { title: string; rooms: (TourRoom & { info: Movement })[]; steps: Step[] };

const byFame = (works: Artwork[]) => [...works].sort((a, b) => b.fame - a.fame);

// Works whose period is genuinely disputed make unfair test questions.
const NOT_FOR_TESTS = new Set(["capitoline-wolf"]);

/** Small seeded random generator, so a given seed always builds the same tour. */
function rng(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(xs: T[], rand: () => number) {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * A route (`route` id), or a single room (`only` names an epoch).
 * `seed` varies the tests from one visit to the next.
 */
export function buildTour({ route, only, seed = 1 }: { route?: string | null; only?: string | null; seed?: number }): Tour {
  const rand = rng(seed);
  const chosen = ROUTES.find((r) => r.id === route) ?? ROUTES[0];
  const byMovement = new Map(GRAND_TOUR.map((r) => [r.movement, r]));
  const route_: TourRoom[] = only
    ? [byMovement.get(only) ?? { movement: only }].filter((r) => getMovement(r.movement))
    : chosen.rooms.map((m) => byMovement.get(m)!);
  const rooms = route_.map((r) => ({ ...r, info: getMovement(r.movement)! }));
  const allRooms = GRAND_TOUR.map((r) => r.movement);
  const single = rooms.length === 1;
  const worksIn = (movement: string) => byFame(worksInMovement(movement));
  const title = only ? `A tour of ${rooms[0]?.info.name ?? "this room"}` : chosen.name;

  // Works held back for tests: everything in a room beyond the ones shown.
  const spare = new Map<string, Artwork[]>();
  const spareFor = (movement: string) => {
    if (!spare.has(movement)) {
      spare.set(movement, shuffle(worksIn(movement).slice(WORKS_PER_ROOM).filter((w) => !NOT_FOR_TESTS.has(w.id)), rand));
    }
    return spare.get(movement)!;
  };
  const take = (movement: string) => spareFor(movement).shift();

  const testedCount = new Map<string, number>();
  const steps: Step[] = [];
  rooms.forEach((r, i) => {
    steps.push({ kind: "room", room: i });
    const forerunners = (r.include ?? []).map((id) => getArtwork(id)).filter((w): w is Artwork => Boolean(w));
    const own = worksIn(r.movement).slice(0, Math.max(WORKS_PER_ROOM, forerunners.length + 2) - forerunners.length);
    // One stop per work: its wall label carries the "look closer" note.
    for (const w of [...forerunners, ...own]) steps.push({ kind: "work", room: i, id: w.id });

    // Rooms the visitor can be tested on: every room visited so far. A single-room
    // tour borrows neighbouring epochs as the other choices.
    const visited = rooms.slice(0, i + 1).map((x) => x.movement);
    const at = allRooms.indexOf(r.movement);
    const pool = single ? [r.movement, allRooms[at - 1], allRooms[at + 1], allRooms[at + 2]].filter(Boolean) : visited;
    const quiz = pool.length >= 2 ? makeQuiz(i, single ? r.movement : null, pool, rand, spareFor, take, testedCount) : null;
    if (quiz) {
      steps.push(quiz);
      testedCount.set(quiz.answer, (testedCount.get(quiz.answer) ?? 0) + 1);
    }

    if (r.bridge && i < rooms.length - 1) steps.push({ kind: "bridge", room: i, text: r.bridge });
  });
  steps.push({ kind: "end" });
  return { title, rooms, steps };
}

function makeQuiz(
  room: number,
  fixedTarget: string | null,
  pool: string[],
  rand: () => number,
  spareFor: (m: string) => Artwork[],
  take: (m: string) => Artwork | undefined,
  testedCount: Map<string, number>,
): Quiz | null {
  // Any visited room can be the answer. Rooms tested least so far come first,
  // chosen at random among themselves, so every room gets its turn.
  const targets = fixedTarget
    ? [fixedTarget]
    : shuffle(pool, rand).sort((a, b) => (testedCount.get(a) ?? 0) - (testedCount.get(b) ?? 0));
  const format = rand() < 0.5 ? "room" : "work";

  for (const target of targets) {
    if (!spareFor(target).length) continue;
    const others = shuffle(
      pool.filter((m) => m !== target && spareFor(m).length > 0),
      rand,
    ).slice(0, 2);

    if (format === "work" && others.length === 2) {
      const correct = take(target)!;
      const decoys = others.map((m) => take(m)!).filter(Boolean);
      return {
        kind: "quiz",
        format: "work",
        room,
        answer: target,
        correctId: correct.id,
        ids: shuffle([correct, ...decoys], rand).map((w) => w.id),
      };
    }
    const options = shuffle(pool.filter((m) => m !== target), rand).slice(0, Math.min(3, pool.length - 1));
    const test = take(target)!;
    return { kind: "quiz", format: "room", room, answer: target, id: test.id, options: shuffle([target, ...options], rand) };
  }
  return null;
}
