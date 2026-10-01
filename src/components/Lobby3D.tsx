"use client";

// The entrance hall of the guided tours: a tall foyer that closes in a
// three-sided apse, with a doorway in each side. Each doorway is lettered with
// its exhibition's name and description and leads straight into that
// exhibition's hall, built right behind it: through the door you see its first
// room. Signature works stand beside the doors and on the side walls.

import { MeshReflectorMaterial } from "@react-three/drei";
import { useMemo, useState } from "react";
import * as THREE from "three";
import { displayFor } from "@/lib/display";
import { QUALITY } from "@/lib/quality";
import type { Exhibition } from "@/lib/exhibitions";
import type { Frame, Hung, Pose, Vec3 } from "@/lib/museum-layout";
import { HALL } from "@/lib/museum-layout";
import { Picture, WallText } from "./Museum3D";

const W = 14; // half width of the foyer
const H = 8; // ceiling height
/** The far wall, with the middle doorway. */
export const BACK = -14;
const APSE = 8; // half the far wall's length; the angled walls run from its ends to the side walls
const FRONT = 22;
const DOOR = { half: 1.3, height: 3.6 };
const WALL = "#3b3732";
const TRIM = "#6a5a3e";

/**
 * The three doorways, left to right: the middle of each, and the turn of its
 * wall (0 faces straight down the foyer; the angled walls face it at 45°).
 * Each exhibition's hall runs straight on from its doorway.
 */
export const DOORS: { x: number; z: number; angle: number }[] = [
  { x: -(W + APSE) / 2, z: BACK + (W - APSE) / 2, angle: Math.PI / 4 },
  { x: 0, z: BACK, angle: 0 },
  { x: (W + APSE) / 2, z: BACK + (W - APSE) / 2, angle: -Math.PI / 4 },
];
const ANGLED_LENGTH = Math.hypot(W - APSE, W - APSE);
/** The taste room's doorway, in the right-hand wall near the apse (the room runs on beyond it). */
export const TASTE_DOOR = { x: W + 0.2, z: -2, angle: -Math.PI / 2 };

/** The foyer's floor space, for where the visitor can stand. */
export const LOBBY_BOUNDS: [number, number] = [-W + 0.5, W - 0.5];
/** All three doorways and their lettering. */
export const OVERVIEW: Frame = { centre: [0, 3.6, BACK + 1.5], normal: [0, 0, 1], width: 27.5, height: 7.2 };
/** One exhibition's doorway and its lettering. */
export const BAY: Frame[] = [...DOORS, TASTE_DOOR].map((d) => ({
  centre: [d.x, 3.6, d.z],
  normal: [Math.sin(d.angle), 0, Math.cos(d.angle)],
  width: 3.9,
  height: 7,
}));
/** Coming in at the front of the foyer. */
export const LOBBY_START: Pose = { pos: [0, HALL.eye, FRONT - 1], look: [0, 2.6, BACK] };

/** The foyer, its lettering and its works. */
export function Lobby({ items, onEnter }: { items: Exhibition[]; onEnter: (i: number) => void }) {
  return (
    <group>
      <Foyer />
      {items.map((ex, i) => (
        <Bay key={ex.id} ex={ex} index={i} onEnter={onEnter} />
      ))}
      <TasteBay onEnter={() => onEnter(items.length)} />
      <SideWalls items={items} />
    </group>
  );
}

/* ----------------------------------------------------------- architecture */

/** The foyer's outline, seen from above (x, z). */
const OUTLINE: [number, number][] = [
  [-W, FRONT],
  [W, FRONT],
  [W, BACK + (W - APSE)],
  [APSE, BACK],
  [-APSE, BACK],
  [-W, BACK + (W - APSE)],
];

/**
 * A wall with a doorway, built facing +z: `before` and `after` are how far it runs
 * to either side of the door (to the visitor's left and right, facing it).
 */
function WallWithDoor({ length, before = length / 2, after = length / 2 }: { length: number; before?: number; after?: number }) {
  const pieces = [
    { x: -(DOOR.half + (before - DOOR.half) / 2), w: before - DOOR.half },
    { x: DOOR.half + (after - DOOR.half) / 2, w: after - DOOR.half },
  ];
  return (
    <group>
      {pieces.map((p) => (
        <mesh key={p.x} position={[p.x, H / 2, 0]}>
          <boxGeometry args={[p.w, H, 0.4]} />
          <meshStandardMaterial color={WALL} roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[0, DOOR.height + (H - DOOR.height) / 2, 0]}>
        <boxGeometry args={[DOOR.half * 2, H - DOOR.height, 0.4]} />
        <meshStandardMaterial color={WALL} roughness={0.95} />
      </mesh>
      {/* A bronze architrave around the opening. */}
      {[-1, 1].map((s) => (
        <mesh key={`t${s}`} position={[s * (DOOR.half + 0.06), DOOR.height / 2, 0.21]}>
          <boxGeometry args={[0.12, DOOR.height + 0.12, 0.04]} />
          <meshStandardMaterial color={TRIM} roughness={0.5} metalness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, DOOR.height + 0.06, 0.21]}>
        <boxGeometry args={[DOOR.half * 2 + 0.24, 0.12, 0.04]} />
        <meshStandardMaterial color={TRIM} roughness={0.5} metalness={0.5} />
      </mesh>
      {/* Skirting. */}
      {pieces.map((p) => (
        <mesh key={`k${p.x}`} position={[p.x, 0.09, 0.21]}>
          <boxGeometry args={[p.w, 0.18, 0.04]} />
          <meshStandardMaterial color="#0f0d0b" />
        </mesh>
      ))}
    </group>
  );
}

function Foyer() {
  // Floor and ceiling follow the foyer's outline, so neither reaches into the halls beyond.
  const floor = useMemo(() => new THREE.ShapeGeometry(new THREE.Shape(OUTLINE.map(([x, z]) => new THREE.Vector2(x, -z)))), []);
  const ceiling = useMemo(() => new THREE.ShapeGeometry(new THREE.Shape(OUTLINE.map(([x, z]) => new THREE.Vector2(x, z)))), []);
  const sideLength = FRONT - (BACK + (W - APSE));
  const sideMid = (FRONT + BACK + (W - APSE)) / 2;
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} geometry={floor}>
        {/* Mirror-like where the device can afford it (it draws the scene twice). */}
        {QUALITY.reflect ? (
          <MeshReflectorMaterial
            resolution={512}
            blur={[400, 120]}
            mixBlur={1}
            mixStrength={18}
            roughness={0.9}
            depthScale={1}
            minDepthThreshold={0.5}
            maxDepthThreshold={1.3}
            color="#241a13"
            metalness={0.4}
            mirror={0.4}
          />
        ) : (
          <meshStandardMaterial color="#241a13" roughness={0.6} metalness={0.2} />
        )}
      </mesh>
      <mesh rotation-x={Math.PI / 2} position={[0, H, 0]} geometry={ceiling}>
        <meshStandardMaterial color="#26241f" />
      </mesh>
      {/* Three long skylights. */}
      {[-6, 0, 6].map((x) => (
        <mesh key={x} rotation-x={Math.PI / 2} position={[x, H - 0.01, (FRONT + BACK + 4) / 2]}>
          <planeGeometry args={[0.6, FRONT - BACK - 6]} />
          <meshBasicMaterial color="#e9dfcc" toneMapped={false} />
        </mesh>
      ))}
      {/* The left wall, plain; the right one opens onto the taste room. */}
      <mesh position={[-W, H / 2, sideMid]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[sideLength, H]} />
        <meshStandardMaterial color={WALL} roughness={0.95} />
      </mesh>
      <mesh position={[-(W - 0.02), 0.09, sideMid]}>
        <boxGeometry args={[0.04, 0.18, sideLength]} />
        <meshStandardMaterial color="#0f0d0b" />
      </mesh>
      <group position={[TASTE_DOOR.x, 0, TASTE_DOOR.z]} rotation-y={TASTE_DOOR.angle}>
        {/* Facing into the foyer, the visitor's left runs toward the apse, the right toward the entrance. */}
        <WallWithDoor length={sideLength} before={TASTE_DOOR.z - (BACK + (W - APSE))} after={FRONT - TASTE_DOOR.z} />
      </group>
      {/* The far wall and the two angled walls, each with its doorway. */}
      {DOORS.map((d, i) => (
        <group key={i} position={[d.x, 0, d.z]} rotation-y={d.angle}>
          <WallWithDoor length={i === 1 ? APSE * 2 : ANGLED_LENGTH} />
        </group>
      ))}
    </group>
  );
}

/** One exhibition: its lettering above the doorway, which is the way in. */
function Bay({ ex, index, onEnter }: { ex: Exhibition; index: number; onEnter: (i: number) => void }) {
  const d = DOORS[index];
  // One click on the doorway, its lettering or its sign walks you in.
  const act = () => onEnter(index);
  const [hover, setHover] = useState(false);

  return (
    <group position={[d.x, 0, d.z]} rotation-y={d.angle}>
      <WallText
        width={3.6}
        height={2.9}
        position={[0, 5.3, 0.21]}
        align="center"
        color="#efe9dc"
        onClick={act}
        lines={[
          { text: `Exhibition ${index + 1} · ${ex.span}`, font: "sans", size: 0.085, tracking: 0.24, caps: true, color: "#cdb88c", weight: 600 },
          { text: ex.name, font: "serif-italic", size: 0.44, lineHeight: 1.05, gap: 0.08 },
          { text: ex.description, font: "sans", size: 0.108, lineHeight: 1.5, gap: 0.14, opacity: 0.88 },
          { text: ex.stats, font: "sans", size: 0.07, tracking: 0.14, caps: true, gap: 0.14, opacity: 0.6 },
        ]}
      />

      {/* The doorway itself is the way in. */}
      <mesh
        position={[0, DOOR.height / 2, 0]}
        onClick={(e) => {
          e.stopPropagation();
          act();
        }}
        onPointerOver={() => {
          setHover(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = "";
        }}
      >
        <planeGeometry args={[DOOR.half * 2, DOOR.height]} />
        <meshBasicMaterial color="#fff4e0" transparent opacity={hover ? 0.05 : 0} depthWrite={false} />
      </mesh>
      {/* A sign in the doorway saying what it does. */}
      <WallText
        width={2.4}
        height={0.4}
        position={[0, 0.6, 0.25]}
        align="center"
        valign="middle"
        color="#efe9dc"
        plate={{ stroke: "rgba(239,233,220,0.85)", fill: "rgba(11,10,9,0.55)" }}
        onClick={act}
        lines={[{ text: "Enter the exhibition", font: "sans", size: 0.11, tracking: 0.16, caps: true, weight: 550 }]}
      />
      {/* The question, on the far wall beside the middle doorway. */}
      {index === 1 && (
        <WallText
          width={4.6}
          height={2.2}
          position={[-4.6, 2.5, 0.21]}
          align="center"
          color="#efe9dc"
          lines={[
            { text: "Guided tours", font: "sans", size: 0.09, tracking: 0.3, caps: true, color: "#cdb88c", weight: 600 },
            { text: "Where shall we begin?", font: "serif", size: 0.46, lineHeight: 1.08, gap: 0.1 },
            {
              text: "Three exhibitions, one after another through history, and a room that learns your taste. Choose a doorway and go in.",
              font: "sans",
              size: 0.1,
              lineHeight: 1.5,
              gap: 0.16,
              opacity: 0.7,
            },
          ]}
        />
      )}
    </group>
  );
}

/** The taste room's doorway: its lettering above, and the way in. */
function TasteBay({ onEnter }: { onEnter: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <group position={[TASTE_DOOR.x, 0, TASTE_DOOR.z]} rotation-y={TASTE_DOOR.angle}>
      <WallText
        width={3.6}
        height={2.9}
        position={[0, 5.3, 0.21]}
        align="center"
        color="#efe9dc"
        onClick={onEnter}
        lines={[
          { text: "Find your taste", font: "sans", size: 0.085, tracking: 0.24, caps: true, color: "#cdb88c", weight: 600 },
          { text: "The Taste Room", font: "serif-italic", size: 0.44, lineHeight: 1.05, gap: 0.08 },
          {
            text: "Two works at a time. Choose the one you would rather live with, and the museum learns what you love.",
            font: "sans",
            size: 0.108,
            lineHeight: 1.5,
            gap: 0.14,
            opacity: 0.88,
          },
          { text: "No right answers · stay as long as you like", font: "sans", size: 0.07, tracking: 0.14, caps: true, gap: 0.14, opacity: 0.6 },
        ]}
      />
      <mesh
        position={[0, DOOR.height / 2, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onEnter();
        }}
        onPointerOver={() => {
          setHover(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = "";
        }}
      >
        <planeGeometry args={[DOOR.half * 2, DOOR.height]} />
        <meshBasicMaterial color="#fff4e0" transparent opacity={hover ? 0.05 : 0} depthWrite={false} />
      </mesh>
      <WallText
        width={2.4}
        height={0.4}
        position={[0, 0.6, 0.25]}
        align="center"
        valign="middle"
        color="#efe9dc"
        plate={{ stroke: "rgba(239,233,220,0.85)", fill: "rgba(11,10,9,0.55)" }}
        onClick={onEnter}
        lines={[{ text: "Enter the taste room", font: "sans", size: 0.11, tracking: 0.16, caps: true, weight: 550 }]}
      />
    </group>
  );
}

/** Hung to fit within a box, keeping the work's proportions (a sculpture or object in a case on the wall). */
function fitted(id: string, pos: Vec3, rotY: number, side: -1 | 1, maxH: number, maxW: number): Hung {
  const d = displayFor(id, maxH, maxW, false);
  return { id, pos, rotY, width: d.width, height: d.height, side, room: 0, mount: d.mount };
}

/** A point on a doorway's wall, `u` along it (to the right as you face it) and `y` up. */
function onDoorWall(i: number, u: number, y: number): Vec3 {
  const d = DOORS[i];
  return [d.x + u * Math.cos(d.angle) + 0.24 * Math.sin(d.angle), y, d.z - u * Math.sin(d.angle) + 0.24 * Math.cos(d.angle)];
}

/**
 * Each exhibition's highlights: its signature work beside its doorway, and the
 * side exhibitions' others on the side walls next to them.
 */
function SideWalls({ items }: { items: Exhibition[] }) {
  const hung: Hung[] = [];
  items.forEach((ex, i) => {
    const [signature, ...rest] = ex.showcase;
    // Beside the doorway: on the angled walls toward the side walls, on the far wall to the right.
    const u = i === 0 ? -2.8 : i === 2 ? 2.8 : 4.6;
    if (signature) hung.push(fitted(signature, onDoorWall(i, u, 2.1), DOORS[i].angle, 1, 1.9, i === 1 ? 2.4 : 2));
    if (i === 1) return;
    const side: -1 | 1 = i === 0 ? -1 : 1;
    rest.forEach((id, j) => {
      // On the right wall, clear of the taste room's doorway.
      const z = side === -1 ? [-1.5, 5][j] : [5.5, 12.5][j];
      hung.push(fitted(id, [side * (W - 0.03), 2.3, z], side === -1 ? Math.PI / 2 : -Math.PI / 2, side, 2, 2.6));
    });
  });
  return (
    <group>
      {hung.map((h) => (
        <Picture key={h.id} hung={h} load portrait={false} />
      ))}
    </group>
  );
}
