// Turns a tour into a building: a long hall of rooms separated by partitions
// with doorways, works hung on alternating walls with their wall texts, and a
// view for every step. Units are metres; the visitor walks toward -z.
//
// Every text lives on a wall. Each step names a rectangle of wall (a "frame")
// the visitor should see whole; the camera works out how far back to stand
// for the screen it's on. Phones get a taller arrangement (labels under the
// works, test pictures hung one above another) so the text stays legible.

import { displayFor, footprintOf, nicheFor, type Display, type Mount } from "@/lib/display";
import { focusFor } from "@/lib/focus";
import type { Tour } from "@/lib/tour";

/** The hall's width, its lowest ceiling (rooms with larger works rise higher), and eye height. */
export const HALL = { halfWidth: 5, height: 5.2, eye: 1.65 };
/** The tallest a room can be. Wider than 10 m, you couldn't step back far enough to see its works whole. */
const MAX_CEILING = 9.5;

export type Vec3 = [number, number, number];
export type Pose = { pos: Vec3; look: Vec3 };

/** A rectangle of wall to be seen whole, and the direction it faces. */
export type Frame = { centre: Vec3; normal: Vec3; width: number; height: number };

export type Hung = {
  id: string;
  /** Centre of the work (or of its niche's opening) on the wall. */
  pos: Vec3;
  rotY: number;
  width: number;
  height: number;
  side: -1 | 1; // -1 left wall, 1 right wall
  room: number;
  mount: Mount;
};

/** Text on a wall. `pos` is its centre; it faces along the wall's normal. */
export type Panel = {
  kind: "label" | "quiz" | "question" | "room" | "room-side" | "bridge" | "end";
  pos: Vec3;
  rotY: number;
  width: number;
  height: number;
  room: number;
  /** The work it describes (label, quiz). */
  id?: string;
  /** The tour step it belongs to (quiz, question, bridge). */
  step?: number;
};

/** A wall across the hall where a room begins; as tall as the taller of the rooms it divides. */
export type Partition = { z: number; room: number; height: number };
/** A room's stretch of hall, and how high its ceiling is. */
export type Segment = { from: number; to: number; room: number; height: number };

export type Station = {
  frame: Frame;
  /** Up close, centred on the work's subject (works only). */
  close?: Pose;
  /** For a work too large to see whole with its label: up close is the label instead. */
  read?: Frame;
  /** Pictures that belong to this step (for clicks in a test). */
  hung: string[];
};

export type Layout = {
  stations: Station[];
  hung: Hung[];
  panels: Panel[];
  partitions: Partition[];
  segments: Segment[];
  endZ: number;
  startZ: number;
  portrait: boolean;
};

const WALL_X = HALL.halfWidth - 0.03;
const CLOSE_DISTANCE = 1.9; // a step toward the canvas, not a zoom lens

/**
 * A point on a side wall, `u` metres to the visitor's right of `z` (as seen
 * facing that wall) and `y` metres up.
 */
function onWall(side: -1 | 1, z: number, u: number, y: number): Vec3 {
  // Facing the left wall, your right is -z; facing the right wall, it's +z.
  return [side * WALL_X, y, z + side * u];
}

const wallNormal = (side: -1 | 1): Vec3 => [-side, 0, 0];
const wallRot = (side: -1 | 1) => (side === -1 ? Math.PI / 2 : -Math.PI / 2);

type Rect = { u: number; y: number; w: number; h: number };

/** The frame around a set of rectangles on one side wall, given in (u, y) around `z`. */
function wallFrame(side: -1 | 1, z: number, rects: Rect[]): Frame {
  const left = Math.min(...rects.map((r) => r.u - r.w / 2));
  const right = Math.max(...rects.map((r) => r.u + r.w / 2));
  const bottom = Math.min(...rects.map((r) => r.y - r.h / 2));
  const top = Math.max(...rects.map((r) => r.y + r.h / 2));
  return {
    centre: onWall(side, z, (left + right) / 2, (bottom + top) / 2),
    normal: wallNormal(side),
    width: right - left,
    height: top - bottom,
  };
}

/** Up close, looking at the subject (a face if known). */
function closePose(h: Hung): Pose {
  const framed = h.mount === "frame";
  // A cut-out is cropped differently from the photograph its face was found in, and
  // stands on the niche's floor: aim at its upper part, where a head usually is.
  const f = framed ? focusFor(h.id) : { x: 0.5, y: 0.3 };
  const centre = framed ? h.pos[1] : h.pos[1] - nicheFor(h.width, h.height).height / 2 + 0.07 + h.height / 2;
  const z = h.pos[2] + h.side * (f.x - 0.5) * h.width;
  const y = centre + (0.5 - f.y) * h.height;
  const eyeY = Math.min(Math.max(y, 1.1), 2.9);
  // Nearer to a small work than a large one.
  const d = Math.max(0.75, Math.min(CLOSE_DISTANCE, Math.max(h.width, h.height) * 1.4));
  return { pos: [h.pos[0] - h.side * d, eyeY, z], look: [h.pos[0], y, z] };
}

/**
 * A work's size on a hall wall: real, unless it is too large to be seen whole
 * from across a 10 m hall (only the colossal monuments are), or on a phone's narrow view.
 */
const hallDisplay = (id: string, portrait: boolean) => displayFor(id, portrait ? 6 : 7.5, portrait ? 5 : 9);

/**
 * Too large to take in together with its label from one spot on this screen:
 * such a work is seen whole, and stepping closer reads the label.
 */
export function tooLargeToRead(id: string, portrait: boolean) {
  const fp = footprintOf(hallDisplay(id, portrait));
  return portrait ? fp.width > 2 || fp.height > 2.2 : fp.width > 3 || fp.height > 3.4;
}

export function layoutTour(tour: Tour, portrait: boolean): Layout {
  const stations: Station[] = [];
  const hung: Hung[] = [];
  const panels: Panel[] = [];
  const partitions: Partition[] = [];
  let cursor = 0;
  let side: -1 | 1 = -1;
  const shown = new Map<string, Station>();
  const partitionFor = new Map<number, number>();
  // How far down the hall each wall is taken: the next thing hung on it starts beyond.
  const free = { [-1]: 0, [1]: 0 } as Record<-1 | 1, number>;

  const newPartition = (room: number) => {
    // Clear of the last room's widest works.
    const z = Math.min(cursor - 8, free[-1] - 3, free[1] - 3);
    partitions.push({ z, room, height: HALL.height }); // set once the room is hung
    partitionFor.set(room, z);
    cursor = z;
    return z;
  };
  const nextSide = () => {
    const s = side;
    side = side === -1 ? 1 : -1;
    return s;
  };
  /**
   * Where along the hall to hang something on wall `s` that runs from `uMin` to `uMax`
   * (to the visitor's left and right of its centre): `step` on from the last thing,
   * or further if that wall is still taken.
   */
  const place = (s: -1 | 1, uMin: number, uMax: number, step: number) => {
    let z = cursor - step;
    const nearEnd = s === -1 ? z - uMin : z + uMin; // the end toward where we came from
    const farEnd = s === -1 ? z - uMax : z + uMax;
    const near = Math.max(nearEnd, farEnd);
    if (near > free[s]) z -= near - free[s];
    free[s] = Math.min(s === -1 ? z - uMax : z + uMin, s === -1 ? z - uMin : z + uMax) - 0.6;
    cursor = z;
    return z;
  };

  /** A work on the wall at (u, y), at its real size within maxH × maxW: framed, or in a niche behind glass. */
  const hang = (id: string, s: -1 | 1, z: number, room: number, u: number, y: number, d: Display): Hung => {
    const h: Hung = { id, pos: onWall(s, z, u, y), rotY: wallRot(s), width: d.width, height: d.height, side: s, room, mount: d.mount };
    hung.push(h);
    return h;
  };
  const letter = (panel: Omit<Panel, "pos" | "rotY" | "width" | "height">, s: -1 | 1, z: number, r: Rect) =>
    panels.push({ ...panel, pos: onWall(s, z, r.u, r.y), rotY: wallRot(s), width: r.w, height: r.h });

  /**
   * A work at its real size with its text beside it (wide screens) or beneath it
   * (phones). Hung at eye level, or as low as a tall work allows. A work too large
   * to take in together with its label on screen is seen whole from further back;
   * stepping closer then reads the label beside it.
   */
  const hangWithText = (id: string, room: number, kind: "label" | "quiz", step: number) => {
    const s = nextSide();
    const d = hallDisplay(id, portrait);
    const fp = footprintOf(d);
    if (portrait) {
      const half = Math.max(fp.width, 1.8) / 2;
      const z = place(s, -half - 0.4, half + 0.4, 4);
      const y = 2.35 + fp.height / 2; // above the text
      const h = hang(id, s, z, room, 0, y, d);
      const work = { u: 0, y, w: fp.width, h: fp.height };
      const text = { u: 0, y: 1.3, w: 1.8, h: 1.7 };
      letter({ kind, id, step, room }, s, z, text);
      const large = tooLargeToRead(id, portrait);
      return { h, frame: wallFrame(s, z, large ? [work] : [work, text]), read: large ? wallFrame(s, z, [text]) : undefined };
    }
    const textU = fp.width / 2 + 0.4 + 0.55;
    const z = place(s, -fp.width / 2 - 0.4, textU + 0.55 + 0.4, 4.6);
    // Centred at eye level, or standing 45 cm off the floor if it's too tall for that.
    const y = d.mount === "frame" ? Math.max(1.6, fp.height / 2 + 0.45) : Math.max(1.55, fp.height / 2 + 0.3);
    const h = hang(id, s, z, room, 0, y, d);
    const work = { u: 0, y, w: fp.width, h: fp.height };
    // Text at reading height, whatever the size of the work.
    const top = Math.min(Math.max(y + fp.height / 2, 2.75), 2.85);
    const text = { u: textU, y: top - 1.05, w: 1.1, h: 2.1 };
    letter({ kind, id, step, room }, s, z, text);
    const large = tooLargeToRead(id, portrait);
    if (!large) return { h, frame: wallFrame(s, z, [work, text]) };
    // Seen whole; up close, the label and the edge of the work beside it.
    const edge = { u: fp.width / 2 - 0.6, y: Math.min(y, 2), w: 1.2, h: Math.min(fp.height, 2.4) };
    return { h, frame: wallFrame(s, z, [work]), read: wallFrame(s, z, [edge, text]) };
  };

  tour.steps.forEach((step, index) => {
    if (step.kind === "bridge") {
      // The next room's partition: the passage that leads there is on its right panel.
      const z = newPartition(step.room + 1);
      const w = portrait ? 2.6 : 2.7;
      const h = portrait ? 3.2 : 2.4;
      const pos: Vec3 = [3.35, portrait ? 2.5 : 2.3, z + 0.16];
      panels.push({ kind: "bridge", step: index, room: step.room + 1, pos, rotY: 0, width: w, height: h });
      stations.push({ frame: { centre: pos, normal: [0, 0, 1], width: w, height: h }, hung: [] });
    } else if (step.kind === "room") {
      const z = partitionFor.get(step.room) ?? newPartition(step.room);
      // The room's introduction, on the left panel of its partition.
      if (portrait) {
        const pos: Vec3 = [-3.35, 2.5, z + 0.16];
        panels.push({ kind: "room", room: step.room, pos, rotY: 0, width: 2.5, height: 3.6 });
        stations.push({ frame: { centre: pos, normal: [0, 0, 1], width: 2.5, height: 3.6 }, hung: [] });
      } else {
        panels.push({ kind: "room", room: step.room, pos: [-4.15, 2.3, z + 0.16], rotY: 0, width: 1.35, height: 2.6 });
        panels.push({ kind: "room-side", room: step.room, pos: [-2.65, 2.3, z + 0.16], rotY: 0, width: 1.45, height: 2.6 });
        stations.push({ frame: { centre: [-3.375, 2.3, z + 0.16], normal: [0, 0, 1], width: 2.95, height: 2.6 }, hung: [] });
      }
      cursor = z - 1.5;
      free[-1] = free[1] = z - 1;
      side = -1;
    } else if (step.kind === "work") {
      const seen = shown.get(step.id);
      if (seen) {
        stations.push(seen);
        return;
      }
      const { h, frame, read } = hangWithText(step.id, step.room, "label", index);
      const station: Station = { frame, close: closePose(h), read, hung: [h.id] };
      shown.set(step.id, station);
      stations.push(station);
    } else if (step.kind === "quiz") {
      if (step.format === "room") {
        const { h, frame, read } = hangWithText(step.id, step.room, "quiz", index);
        stations.push({ frame, read, hung: [h.id] });
        return;
      }
      // Three works on one wall with the question lettered above them:
      // side by side on wide screens, hung one above another on phones.
      const s = nextSide();
      if (portrait) {
        const z = place(s, -1.2, 1.2, 3.6);
        const ys = [3.4, 2.25, 1.1];
        // Real sizes, but each within its share of the wall.
        const trio = step.ids.map((id, i) => hang(id, s, z, step.room, 0, ys[i], displayFor(id, 0.95, 1.5)));
        const q = { u: 0, y: 4.45, w: 2, h: 0.95 };
        letter({ kind: "question", step: index, room: step.room }, s, z, q);
        stations.push({ frame: wallFrame(s, z, [{ u: 0, y: 2.2, w: 1.5, h: 3.45 }, q]), hung: trio.map((t) => t.id) });
      } else {
        const spacing = 2.2;
        const z = place(s, -spacing - 1.4, spacing + 1.4, 4.8);
        const trio = step.ids.map((id, i) => hang(id, s, z, step.room, (i - 1) * spacing, 1.85, displayFor(id, 1.6, 2)));
        const width = spacing * 2 + 1.85;
        const q = { u: 0, y: 3.3, w: 4.4, h: 1.05 };
        letter({ kind: "question", step: index, room: step.room }, s, z, q);
        stations.push({ frame: wallFrame(s, z, [{ u: 0, y: 1.7, w: width, h: 1.7 }, q]), hung: trio.map((t) => t.id) });
      }
    } else {
      // The end: a closing wall across the hall.
      const z = Math.min(cursor - 8, free[-1] - 3, free[1] - 3);
      const w = portrait ? 3.2 : 5.4;
      const h = portrait ? 2.4 : 1.7;
      const pos: Vec3 = [0, 2.4, z + 0.04];
      panels.push({ kind: "end", room: tour.rooms.length - 1, pos, rotY: 0, width: w, height: h });
      stations.push({ frame: { centre: pos, normal: [0, 0, 1], width: w, height: h }, hung: [] });
      cursor = z;
    }
  });

  // Each room is as tall as its tallest work needs (with room above it), in half metres.
  const ceiling = new Map<number, number>();
  for (const h of hung) {
    const top = h.pos[1] + footprintOf(h).height / 2;
    ceiling.set(h.room, Math.max(ceiling.get(h.room) ?? 0, top));
  }
  const heightOf = (room: number) =>
    Math.min(MAX_CEILING, Math.max(HALL.height, Math.ceil(((ceiling.get(room) ?? 0) + 1) * 2) / 2));
  for (const p of partitions) p.height = Math.max(heightOf(p.room), heightOf(p.room - 1));

  // Each room's stretch of wall runs from its partition to the next one.
  const sorted = [...partitions].sort((a, b) => b.z - a.z);
  const segments: Segment[] = sorted.map((p, i) => ({ from: p.z, to: sorted[i + 1]?.z ?? cursor, room: p.room, height: heightOf(p.room) }));
  const startZ = (sorted[0]?.z ?? 0) + 12;
  segments.unshift({ from: startZ, to: sorted[0]?.z ?? cursor, room: -1, height: HALL.height });
  return { stations, hung, panels, partitions, segments, endZ: cursor, startZ, portrait };
}

/**
 * Where to stand to see a frame whole on this screen: straight out from the
 * wall, far enough back for it to fit with a margin, at eye height, and
 * within the room's walls (`bounds`, in x).
 */
export function framePose(f: Frame, aspect: number, fovDeg: number, bounds?: [number, number], fill = 0.86): Pose {
  const tv = Math.tan((fovDeg * Math.PI) / 360);
  const th = tv * aspect;
  // Leave a little more room at the foot of the view, where the controls sit.
  const foot = f.height * (aspect < 1 ? 0.14 : 0.06);
  const height = f.height + foot;
  const centre: Vec3 = [f.centre[0], f.centre[1] - foot / 2, f.centre[2]];
  const d = Math.max(1.4, Math.max(f.width / (2 * th), height / (2 * tv)) / fill);
  const pos = centre.map((v, i) => v + f.normal[i] * d) as Vec3;
  const [minX, maxX] = bounds ?? [-(HALL.halfWidth - 0.35), HALL.halfWidth - 0.35];
  pos[0] = Math.max(minX, Math.min(maxX, pos[0]));
  // Eye height, rising a little for high texts so they don't read in steep perspective.
  pos[1] = Math.max(HALL.eye, Math.min(centre[1], 2.1));
  return { pos, look: centre };
}
