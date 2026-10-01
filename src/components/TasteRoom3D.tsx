"use client";

// The taste room, through its own doorway in the entrance hall: a quiet room
// with two works on its far wall. Click the one you would rather live with;
// the pair is exchanged, and the museum learns your taste (lib/usePairs).
// The question, how much the museum has learned, and what your last choice
// suggests are lettered above them.
//
// Laid out in its own coordinates, like a hall: the entrance at z = 0, the
// room running toward -z.

import { useThree } from "@react-three/fiber";
import { getArtist, getArtwork } from "@/data";
import { fittedTo } from "@/lib/display";
import type { Frame, Hung } from "@/lib/museum-layout";
import { Picture, WallText } from "./Museum3D";

export const TASTE_ROOM = { halfWidth: 3.5, depth: 12, height: 6.2 };
const WALL = "#3a3631";

/** What to look at in the room: the pair and the lettering above it (side by side, or stacked on a phone). */
export const tasteFrame = (portrait: boolean): Frame =>
  portrait
    ? { centre: [0, 3.25, -TASTE_ROOM.depth], normal: [0, 0, 1], width: 3.2, height: 5.6 }
    : { centre: [0, 2.85, -TASTE_ROOM.depth], normal: [0, 0, 1], width: 6.6, height: 4.7 };

export type TasteRoomProps = {
  pair: [string, string] | null | undefined;
  /** The choice being shown for a moment before the pair moves on. */
  outcome: { winner: string | null; verdict?: string } | null;
  insight: string | null;
  decided: number;
  /** How much the museum has learned, 0 to 1. */
  signal: number;
  onChoose: (id: string) => void;
};

export function TasteRoom({ pair, outcome, insight, decided, signal, onChoose }: TasteRoomProps) {
  const portrait = useThree((s) => s.size.width < s.size.height);
  const { halfWidth: W, depth: D, height: H } = TASTE_ROOM;
  const back = -D + 0.03;

  // Where the two works hang: side by side, or one above the other on a phone.
  const slots = portrait
    ? [
        { x: 0, y: 4.15, maxH: 1.85, maxW: 3 },
        { x: 0, y: 1.45, maxH: 1.85, maxW: 3 },
      ]
    : [
        { x: -1.7, y: 2.4, maxH: 2.45, maxW: 2.85 },
        { x: 1.7, y: 2.4, maxH: 2.45, maxW: 2.85 },
      ];

  const progress =
    decided === 0
      ? "Your first choice"
      : `${decided} ${decided === 1 ? "choice" : "choices"} · the museum knows ${Math.round(signal * 100)}% of your taste`;

  return (
    <group>
      {/* The room. */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, -D / 2]}>
        <planeGeometry args={[W * 2, D]} />
        <meshStandardMaterial color="#241a13" roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position={[0, H, -D / 2]}>
        <planeGeometry args={[W * 2, D]} />
        <meshStandardMaterial color="#26241f" />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position={[0, H - 0.01, -D / 2]}>
        <planeGeometry args={[0.6, D - 1.5]} />
        <meshBasicMaterial color="#e9dfcc" toneMapped={false} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * W, H / 2, -D / 2]} rotation-y={s === -1 ? Math.PI / 2 : -Math.PI / 2}>
          <planeGeometry args={[D, H]} />
          <meshStandardMaterial color={WALL} roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[0, H / 2, -D]}>
        <planeGeometry args={[W * 2, H]} />
        <meshStandardMaterial color={WALL} roughness={0.95} />
      </mesh>

      {/* The question, and how far the museum has got. */}
      <WallText
        width={portrait ? 3.2 : 6}
        height={portrait ? 0.95 : 1}
        position={[0, portrait ? 5.55 : 4.55, back]}
        align="center"
        color="#efe9dc"
        lines={[
          { text: "Which would you rather live with?", font: "serif", size: portrait ? 0.22 : 0.3, lineHeight: 1.1 },
          {
            text: insight ?? progress,
            font: insight ? "serif-italic" : "sans",
            size: insight ? 0.1 : 0.07,
            tracking: insight ? 0 : 0.14,
            caps: !insight,
            color: insight ? "#cdb88c" : undefined,
            opacity: insight ? 1 : 0.6,
            gap: 0.1,
          },
        ]}
      />

      {/* The pair: each the same size, so neither wins by being bigger. */}
      {pair?.map((id, i) => {
        const slot = slots[i];
        const d = fittedTo(id, slot.maxH, slot.maxW);
        const hung: Hung = { id, pos: [slot.x, slot.y, back], rotY: 0, width: d.width, height: d.height, side: 1, room: 0, mount: d.mount };
        const art = getArtwork(id)!;
        const chosen = outcome?.winner === id || outcome?.verdict === "both";
        const passed = Boolean(outcome) && !chosen;
        return (
          <group key={id}>
            <Picture hung={hung} load portrait={portrait} onClick={outcome ? undefined : () => onChoose(id)} />
            <WallText
              width={Math.max(d.width, 2)}
              height={0.3}
              // Clear of the frame or case below the work.
              position={[slot.x, slot.y - d.height / 2 - (d.mount === "frame" ? 0.42 : 0.62), back]}
              align="center"
              color={chosen ? "#cdb88c" : "#efe9dc"}
              lines={[
                { text: getArtist(art.artist)?.name ?? art.culture ?? "", font: "sans", size: 0.05, tracking: 0.12, caps: true, opacity: passed ? 0.3 : 0.7 },
                { text: `${art.title}, ${art.year}`, font: "serif-italic", size: 0.075, gap: 0.02, opacity: passed ? 0.35 : 1 },
              ]}
            />
          </group>
        );
      })}
    </group>
  );
}
