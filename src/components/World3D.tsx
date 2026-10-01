"use client";

// The whole building in one scene, so the visitor never cuts from place to
// place: the entrance hall, and behind each of its three doorways that
// exhibition's hall. Choosing an exhibition, touring it, going on to the next,
// or back to the entrance are all moves through the same rooms.
//
// Each hall is laid out in its own coordinates (see museum-layout) and set
// down behind its doorway, turned to run straight on from it. A one-room tour
// (from an epoch page) is just its hall, entered from its end.

import { Canvas, useThree } from "@react-three/fiber";
import { useCallback, useMemo } from "react";
import * as THREE from "three";
import type { Exhibition } from "@/lib/exhibitions";
import { HALL, framePose, layoutTour, type Layout, type Pose, type Vec3 } from "@/lib/museum-layout";
import type { Tour } from "@/lib/tour";
import { BAY, DOORS, LOBBY_BOUNDS, LOBBY_START, Lobby, OVERVIEW } from "./Lobby3D";
import { Daylight, ExhibitionHall, GlideTo, fovFor, waypoints, type Door, type MuseumProps } from "./Museum3D";

export type WorldProps = Omit<MuseumProps, "tour" | "index" | "next" | "onLobby"> & {
  /** Every hall in the building: the exhibitions, or the one room of a one-room tour. */
  halls: { id: string; tour: Tour }[];
  /** The entrance hall's exhibitions; null for a one-room tour. */
  lobby: Exhibition[] | null;
  /** The hall being toured, or null while in the entrance hall. */
  active: string | null;
  /** Where the visitor stood when this page opened, if that was a hall. */
  startIn: string | null;
  /** In the entrance hall: -1 for all the doorways, else one exhibition. */
  lobbyView: number;
  index: number;
  close: boolean;
  onEnter: (i: number) => void;
  onLobby: () => void;
};

export function World3D(props: WorldProps) {
  return (
    <Canvas className="!absolute inset-0" dpr={[1, 2]} flat gl={{ antialias: true }} camera={{ fov: 50, near: 0.05, far: 260 }}>
      <Daylight />
      <Scene {...props} />
    </Canvas>
  );
}

const NONE: Record<number, string> = {};
const HALF = HALL.halfWidth - 0.35;

/** Where a hall stands: moved by `offset` and turned by `angle` about the vertical. */
type Place = { offset: Vec3; angle: number };
const toWorld = ([x, y, z]: Vec3, { offset, angle }: Place): Vec3 => [
  x * Math.cos(angle) + z * Math.sin(angle) + offset[0],
  y + offset[1],
  -x * Math.sin(angle) + z * Math.cos(angle) + offset[2],
];
const toLocal = ([x, y, z]: Vec3, { offset, angle }: Place): Vec3 => {
  const dx = x - offset[0];
  const dz = z - offset[2];
  return [dx * Math.cos(angle) - dz * Math.sin(angle), y - offset[1], dx * Math.sin(angle) + dz * Math.cos(angle)];
};
const poseToWorld = (p: Pose, place: Place): Pose => ({ pos: toWorld(p.pos, place), look: toWorld(p.look, place) });
const v3 = (p: Vec3) => new THREE.Vector3(...p);
const arr = (v: THREE.Vector3): Vec3 => [v.x, v.y, v.z];

function Scene({ halls, lobby, active, startIn, lobbyView, index, close, onEnter, onLobby, ...rest }: WorldProps) {
  // Phones get a taller hang, so the layouts depend on the screen's shape.
  const size = useThree((s) => s.size);
  const aspect = size.width / size.height;
  const portrait = aspect < 1;
  const fov = fovFor(aspect);

  // Each hall, set down so that its entrance is right behind its doorway.
  const placed = useMemo(
    () =>
      halls.map((h, i) => {
        const layout: Layout = layoutTour(h.tour, portrait);
        let place: Place = { offset: [0, 0, 0], angle: 0 };
        if (lobby) {
          const d = DOORS[i];
          // Just behind the wall, the hall's entrance (its startZ) runs on in the doorway's direction.
          const back: Vec3 = [d.x - 0.2 * Math.sin(d.angle), 0, d.z - 0.2 * Math.cos(d.angle)];
          const start = toWorld([0, 0, layout.startZ], { offset: [0, 0, 0], angle: d.angle });
          place = { offset: [back[0] - start[0], 0, back[2] - start[2]], angle: d.angle };
        }
        const doors: Door[] = layout.partitions.map((p) => ({ z: p.z, x: 0, lane: 0.9 }));
        return { ...h, i, layout, place, doors };
      }),
    [halls, lobby, portrait],
  );
  const current = placed.find((h) => h.id === active);

  // Where to stand: a stretch of wall in the hall being toured (worked out in the
  // hall's own coordinates, then set down in the world), or the foyer's doorways.
  const station = current?.layout.stations[index];
  const pose = useMemo<Pose | undefined>(() => {
    if (current && station) {
      const local =
        close && !station.read && station.close
          ? station.close
          : framePose(close && station.read ? station.read : station.frame, aspect, fov, [-HALF, HALF]);
      return poseToWorld(local, current.place);
    }
    if (lobby) return framePose(lobbyView < 0 ? OVERVIEW : BAY[lobbyView], aspect, fov, LOBBY_BOUNDS);
    return undefined;
  }, [current, station, close, aspect, fov, lobby, lobbyView]);

  // Arriving: at the front of the foyer, or (opening a tour directly) just before its doorway.
  const start = useMemo<Pose | undefined>(() => {
    if (!lobby) return undefined;
    const h = placed.find((p) => p.id === startIn);
    if (!h) return LOBBY_START;
    return poseToWorld({ pos: [0, HALL.eye, h.layout.startZ + 7], look: [0, 2, h.layout.startZ] }, h.place);
  }, [lobby, placed, startIn]);

  /**
   * The way from one spot to another through the building: inside a hall, through
   * its doorways; between halls, out through one hall's entrance, across the foyer,
   * and in through the other's.
   */
  const plan = useCallback(
    (from: THREE.Vector3, to: THREE.Vector3) => {
      type Placed = (typeof placed)[number];
      const inside = (p: THREE.Vector3) =>
        placed.findIndex((h) => {
          if (!lobby) return true;
          const [x, , z] = toLocal(arr(p), h.place);
          return Math.abs(x) < HALL.halfWidth + 0.3 && z < h.layout.startZ;
        });
      const within = (h: Placed, a: THREE.Vector3, b: THREE.Vector3) =>
        waypoints(v3(toLocal(arr(a), h.place)), v3(toLocal(arr(b), h.place)), h.doors).map((p) => v3(toWorld(arr(p), h.place)));
      const entrance = (h: Placed, out: boolean) => v3(toWorld([0, HALL.eye, h.layout.startZ + (out ? 1.6 : -1.1)], h.place));

      const a = inside(from);
      const b = inside(to);
      if (a >= 0 && a === b) return within(placed[a], from, to);
      const points = [from];
      if (a >= 0) points.push(...within(placed[a], from, entrance(placed[a], false)).slice(1), entrance(placed[a], true));
      if (b >= 0) points.push(entrance(placed[b], true), ...within(placed[b], entrance(placed[b], false), to));
      else points.push(to);
      return points;
    },
    [placed, lobby],
  );

  return (
    <>
      {lobby && <Lobby items={lobby} onEnter={onEnter} />}
      {placed.map((h) => {
        const next = lobby && h.i < placed.length - 1 ? { name: lobby[h.i + 1].name, go: () => onEnter(h.i + 1) } : undefined;
        return (
          <group key={h.id} position={h.place.offset} rotation-y={h.place.angle}>
            <ExhibitionHall
              layout={h.layout}
              offset={[0, 0, 0]}
              reflect={h.id === active || !lobby}
              tour={h.tour}
              index={h.id === active ? index : -1}
              {...rest}
              // Answers belong to the tour being walked; the others show their tests unanswered.
              answers={h.id === active ? rest.answers : NONE}
              next={next}
              onLobby={lobby ? onLobby : undefined}
            />
          </group>
        );
      })}
      <GlideTo pose={pose} plan={plan} start={start} />
    </>
  );
}
