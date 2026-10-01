"use client";

// A real 3D gallery: a long hall of rooms, one per epoch, joined by doorways.
// The camera glides from station to station, turns to face each work, moves
// up close and back. Every text is lettered on the walls, as in a museum:
// room introductions by the doorways, a label beside each work, the tests
// beside their pictures, and the way out on the closing wall.

import { MeshReflectorMaterial } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { getArtist, getArtwork, getMovement, yearLabel } from "@/data";
import { nicheFor } from "@/lib/display";
import { QUALITY } from "@/lib/quality";
import { HALL, type Hung, type Layout, type Panel, type Pose, type Vec3 } from "@/lib/museum-layout";
import type { Tour } from "@/lib/tour";
import { CutOutWork, FrameReflections, FramedWork } from "./Exhibit3D";

/** Wall colours by epoch, as a museum would paint its rooms. */
const WALLS: Record<string, string> = {
  "prehistoric-art": "#3a3129",
  "ancient-near-east": "#40342a",
  "ancient-egypt": "#453726",
  "classical-antiquity": "#3a3d3f",
  "medieval-europe": "#232a3d",
  "song-landscape": "#2f3a33",
  "italian-renaissance": "#263a31",
  "northern-renaissance": "#35302a",
  baroque: "#4a1f1c",
  "dutch-golden-age": "#2a323b",
  romanticism: "#2b3140",
  "ukiyo-e": "#3b3129",
  impressionism: "#6b6a64",
  "post-impressionism": "#3e3524",
  "vienna-secession": "#2e2a22",
  expressionism: "#242424",
  "early-abstraction": "#d8d6d0",
};
const DEFAULT_WALL = "#2a2825";

/** Lettering colours that read on a room's walls. */
function inkFor(tour: Tour, room: number) {
  const wall = new THREE.Color(WALLS[tour.rooms[room]?.movement] ?? DEFAULT_WALL);
  const light = wall.r * 0.3 + wall.g * 0.59 + wall.b * 0.11 > 0.45;
  return light ? { ink: "#1d1b18", accent: "#7a5f2e" } : { ink: "#efe9dc", accent: "#cdb88c" };
}

export type MuseumProps = {
  tour: Tour;
  /** The current step, or -1 for a hall you're not touring (seen through its doorway). */
  index: number;
  /** Answers to the tests, by step index: a movement id or a work id. */
  answers: Record<number, string>;
  onAnswer: (step: number, choice: string) => void;
  onToggleClose: () => void;
  score: { right: number; total: number };
  onRestart: () => void;
  onFindTaste: () => void;
  /** The exhibition that follows this one, if any: its doorway is on the exit wall. */
  next?: { name: string; go: () => void };
  /** Back to the entrance hall (exhibitions only; a one-room tour has none). */
  onLobby?: () => void;
};

/** The world's light: daylight from the skylights, warm and even, as in a top-lit gallery. */
export function Daylight() {
  return (
    <>
      <color attach="background" args={["#0b0a09"]} />
      <fog attach="fog" args={["#0b0a09", 22, 66]} />
      <ambientLight intensity={1} />
      <hemisphereLight args={["#fff2dc", "#3a2a1c", 1.45]} />
      <directionalLight position={[2, 10, 3]} intensity={0.5} color="#fff4e2" />
      <FrameReflections />
    </>
  );
}

/**
 * One exhibition's hall, placed at `offset` in the world. Only the hall being
 * toured is interactive and has the reflective floor; the other is seen
 * through its doorway.
 */
export function ExhibitionHall({ layout, offset, reflect, ...props }: MuseumProps & { layout: Layout; offset: Vec3; reflect: boolean }) {
  const hereZ = layout.stations[Math.max(0, props.index)]?.frame.centre[2] ?? 0;
  // On a phone, a hall seen only through its doorway is just its rooms and first lettering.
  const glimpse = QUALITY.lite && props.index < 0;
  return (
    <group position={offset}>
      <Hall layout={layout} tour={props.tour} hereZ={hereZ} reflect={reflect && QUALITY.reflect} />
      {!glimpse && <Pictures layout={layout} {...props} hereZ={hereZ} />}
      <WallTexts layout={layout} {...props} hereZ={hereZ} radius={glimpse ? 15 : QUALITY.texts} />
    </group>
  );
}

/* ------------------------------------------------------------------ hall */

function Hall({ layout, tour, hereZ, reflect }: { layout: Layout; tour: Tour; hereZ: number; reflect: boolean }) {
  const { halfWidth: W } = HALL;
  // Nothing reaches past the entrance, which opens onto the entrance hall.
  const floorFront = Math.min(hereZ + 20, layout.startZ);
  const floorBack = hereZ - 40;
  const last = layout.segments[layout.segments.length - 1]?.height ?? HALL.height;

  return (
    <group>
      {/* Floor: dark, waxed wood that mirrors the light. Kept near the visitor. */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, (floorFront + floorBack) / 2]}>
        <planeGeometry args={[W * 2, floorFront - floorBack]} />
        {reflect ? (
          <MeshReflectorMaterial
            key="mirror"
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
          <meshStandardMaterial key="matte" color="#241a13" roughness={0.6} metalness={0.2} />
        )}
      </mesh>
      {/* Each room: its walls, painted for its period, and its ceiling, as high as its works need, with two long skylights. */}
      {layout.segments.map((s, i) => {
        const color = s.room >= 0 ? (WALLS[tour.rooms[s.room]?.movement] ?? DEFAULT_WALL) : DEFAULT_WALL;
        // The last room runs on to the closing wall.
        const to = i === layout.segments.length - 1 ? layout.endZ - 3 : s.to;
        const len = s.from - to;
        const z = (s.from + to) / 2;
        const H = s.height;
        return (
          <group key={i}>
            {([-1, 1] as const).map((side) => (
              <SideWall key={side} side={side} from={s.from} to={to} height={H} color={color} hung={layout.hung} />
            ))}
            {/* Skirting boards. */}
            {[-1, 1].map((side) => (
              <mesh key={`sk${side}`} position={[side * (W - 0.02), 0.08, z]}>
                <boxGeometry args={[0.04, 0.16, len]} />
                <meshStandardMaterial color="#0f0d0b" />
              </mesh>
            ))}
            <mesh rotation-x={Math.PI / 2} position={[0, H, z]}>
              <planeGeometry args={[W * 2, len]} />
              <meshStandardMaterial color="#26241f" />
            </mesh>
            {[-2.2, 2.2].map((x) => (
              <mesh key={x} rotation-x={Math.PI / 2} position={[x, H - 0.01, z]}>
                <planeGeometry args={[0.5, Math.max(0.1, len - 1)]} />
                <meshBasicMaterial color="#e9dfcc" toneMapped={false} />
              </mesh>
            ))}
          </group>
        );
      })}

      {/* Partitions: a wall across the hall with a tall doorway. */}
      {layout.partitions.map((p) => {
        const color = WALLS[tour.rooms[p.room]?.movement] ?? DEFAULT_WALL;
        const door = 1.7;
        const panel = W - door;
        const H = p.height;
        return (
          <group key={p.z} position={[0, 0, p.z]}>
            {[-1, 1].map((side) => (
              <mesh key={side} position={[side * (door + panel / 2), H / 2, 0]}>
                <boxGeometry args={[panel, H, 0.3]} />
                <meshStandardMaterial color={color} roughness={0.95} />
              </mesh>
            ))}
            <mesh position={[0, 3.6 + (H - 3.6) / 2, 0]}>
              <boxGeometry args={[door * 2, H - 3.6, 0.3]} />
              <meshStandardMaterial color={color} roughness={0.95} />
            </mesh>
          </group>
        );
      })}

      {/* The closing wall. */}
      <mesh position={[0, last / 2, layout.endZ - 0.2]}>
        <boxGeometry args={[W * 2, last, 0.3]} />
        <meshStandardMaterial color="#2a2825" roughness={0.95} />
      </mesh>
    </group>
  );
}

/**
 * One stretch of side wall, with an opening wherever a niche is set into it.
 * Built in the wall's own plane: x along the wall (facing it), y up from its middle.
 */
function SideWall({ side, from, to, height: H, color, hung }: { side: -1 | 1; from: number; to: number; height: number; color: string; hung: Hung[] }) {
  const { halfWidth: W } = HALL;
  const len = from - to;
  const z = (from + to) / 2;
  const openings = hung.filter((h) => h.mount === "niche" && h.side === side && h.pos[2] < from && h.pos[2] > to);
  const key = openings.map((h) => `${h.id}:${h.pos[2]}`).join("|");
  const geometry = useMemo(() => {
    if (!openings.length) return new THREE.PlaneGeometry(len, H);
    const shape = new THREE.Shape();
    shape.moveTo(-len / 2, -H / 2);
    shape.lineTo(len / 2, -H / 2);
    shape.lineTo(len / 2, H / 2);
    shape.lineTo(-len / 2, H / 2);
    shape.closePath();
    for (const h of openings) {
      const n = nicheFor(h.width, h.height);
      // Facing the left wall, along-the-wall runs toward -z; facing the right wall, toward +z.
      const x = side === -1 ? z - h.pos[2] : h.pos[2] - z;
      const y = h.pos[1] - H / 2;
      const hole = new THREE.Path();
      hole.moveTo(x - n.width / 2, y - n.height / 2);
      hole.lineTo(x - n.width / 2, y + n.height / 2);
      hole.lineTo(x + n.width / 2, y + n.height / 2);
      hole.lineTo(x + n.width / 2, y - n.height / 2);
      hole.closePath();
      shape.holes.push(hole);
    }
    return new THREE.ShapeGeometry(shape);
    // `key` stands for the openings.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, len, H, side, z]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} position={[side * W, H / 2, z]} rotation-y={side === -1 ? Math.PI / 2 : -Math.PI / 2}>
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  );
}

/* -------------------------------------------------------------- pictures */

const poolTexture = (() => {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(128, 110, 0, 128, 128, 128);
  grad.addColorStop(0, "rgba(255,240,215,0.85)");
  grad.addColorStop(0.55, "rgba(255,236,205,0.25)");
  grad.addColorStop(1, "rgba(255,236,205,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();

function Pictures({ layout, tour, index, answers, onAnswer, onToggleClose, hereZ }: MuseumProps & { layout: Layout; hereZ: number }) {
  const step = tour.steps[index];
  const active = new Set(layout.stations[index]?.hung ?? []);
  const trio = step?.kind === "quiz" && step.format === "work" ? step : null;
  const answered = trio ? answers[index] : undefined;

  return (
    <group>
      {layout.hung.map((h) => {
        // Pictures far down the hall are let go (and their images with them) until you come back.
        const distance = Math.abs(h.pos[2] - hereZ);
        if (distance > QUALITY.keep) return null;
        const isActive = active.has(h.id);
        const { ink, accent } = inkFor(tour, h.room);
        // In a three-work test the pictures are the answers; after answering, each is named.
        const label =
          trio && isActive && answered
            ? { text: getMovement(getArtwork(h.id)!.movement)?.name ?? "", color: h.id === trio.correctId ? accent : ink, strong: h.id === trio.correctId }
            : undefined;
        const onClick = !isActive ? undefined : trio ? (answered ? undefined : () => onAnswer(index, h.id)) : step?.kind === "work" ? onToggleClose : undefined;
        return (
          <Picture
            key={`${h.id}-${h.pos[2]}`}
            hung={h}
            load={distance < QUALITY.near}
            onClick={onClick}
            label={label}
            portrait={layout.portrait}
          />
        );
      })}
    </group>
  );
}

export function Picture({
  hung,
  load,
  onClick,
  label,
  portrait,
}: {
  hung: Hung;
  load: boolean;
  onClick?: () => void;
  label?: { text: string; color: string; strong: boolean };
  portrait: boolean;
}) {
  const framed = hung.mount === "frame";
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const art = getArtwork(hung.id)!;

  useEffect(() => {
    if (!framed || !load || texture) return;
    const src = art.image.src.includes("/1280px-") ? art.image.src.replace("/1280px-", QUALITY.image) : art.image.src;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    let alive = true;
    const done = (t: THREE.Texture) => {
      if (!alive) return;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      setTexture(t);
    };
    // Fall back to the 1280px rendition if the asked-for one doesn't exist.
    loader.load(src, done, undefined, () => loader.load(art.image.src, done));
    return () => {
      alive = false;
    };
  }, [framed, load, texture, art.image.src]);
  // Free the image's memory when the picture is let go.
  useEffect(() => () => texture?.dispose(), [texture]);

  const { width: w, height: h } = hung;
  const pointer = usePointerCursor(Boolean(onClick));
  // A label under a work goes under its niche's opening.
  const below = framed ? h / 2 : nicheFor(w, h).height / 2 + 0.05;

  return (
    <group position={hung.pos} rotation-y={hung.rotY}>
      {/* The pool of light from a ceiling spot (a niche has its own light). */}
      {poolTexture && framed && (
        <mesh position={[0, 0.3, -0.01]} raycast={() => null}>
          <planeGeometry args={[w + 1.8, h + 2.2]} />
          <meshBasicMaterial map={poolTexture} transparent opacity={0.28} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      )}
      {/* The work: framed on the wall, or in its niche. Clicking it steps close (or answers a test). */}
      <group
        onClick={(e) => {
          if (!onClick) return;
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={pointer.onPointerOver}
        onPointerOut={pointer.onPointerOut}
      >
        {framed ? <FramedWork hung={hung} texture={texture} /> : <CutOutWork hung={hung} load={load} />}
      </group>
      {label && (
        <WallText
          width={Math.max(w, 1.8)}
          height={portrait ? 0.12 : 0.16}
          position={[0, -below - (portrait ? 0.14 : 0.24), 0.01]}
          align="center"
          color={label.color}
          lines={[{ text: label.text, font: "sans", size: portrait ? 0.07 : 0.075, tracking: 0.16, caps: true, weight: label.strong ? 600 : 500, opacity: label.strong ? 1 : 0.6 }]}
        />
      )}
    </group>
  );
}

/** Pointer cursor over something clickable in the scene. */
function usePointerCursor(enabled: boolean) {
  const [hover, setHover] = useState(false);
  useEffect(() => {
    if (!enabled || !hover) return;
    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hover, enabled]);
  return {
    hover: enabled && hover,
    onPointerOver: () => setHover(true),
    onPointerOut: () => setHover(false),
  };
}

/* ------------------------------------------------------------- lettering */

export type Line = {
  text: string;
  font: "sans" | "serif" | "serif-italic";
  /** Font size (em) in metres. */
  size: number;
  lineHeight?: number;
  /** Space above, in metres. */
  gap?: number;
  /** Letter spacing in em. */
  tracking?: number;
  caps?: boolean;
  weight?: number;
  opacity?: number;
  color?: string;
  bullet?: boolean;
  strike?: boolean;
  /** Keep on one row, shrinking to the panel's width if needed. */
  fit?: boolean;
};

/**
 * Lettering applied to the wall, like vinyl text in a gallery. Drawn on a
 * canvas once the web fonts are ready, sharp enough to read up close, and
 * shrunk to fit if the text runs long. A `plate` draws a bordered panel
 * around it (used for the answers in a test and the exit's choices).
 */
export function WallText({
  width,
  height,
  position,
  lines,
  color,
  align = "left",
  valign = "top",
  plate,
  padding = 0,
  onClick,
}: {
  width: number;
  height: number;
  position: [number, number, number];
  lines: Line[];
  color: string;
  align?: "left" | "center";
  valign?: "top" | "middle";
  plate?: { stroke: string; fill?: string };
  padding?: number;
  onClick?: () => void;
}) {
  const spec = JSON.stringify({ width, height, lines, color, align, valign, plate, padding });
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  const pointer = usePointerCursor(Boolean(onClick));

  useEffect(() => {
    let alive = true;
    let made: THREE.CanvasTexture | null = null;
    document.fonts.ready.then(() => {
      if (!alive) return;
      made = paint(JSON.parse(spec));
      setTexture(made);
    });
    return () => {
      alive = false;
      made?.dispose();
    };
  }, [spec]);

  if (!texture) return null;
  return (
    <mesh
      position={position}
      onClick={
        onClick &&
        ((e) => {
          e.stopPropagation();
          onClick();
        })
      }
      onPointerOver={pointer.onPointerOver}
      onPointerOut={pointer.onPointerOut}
    >
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} opacity={pointer.hover ? 0.8 : 1} />
    </mesh>
  );
}

function paint(o: {
  width: number;
  height: number;
  lines: Line[];
  color: string;
  align: "left" | "center";
  valign: "top" | "middle";
  plate?: { stroke: string; fill?: string };
  padding: number;
}) {
  // Enough pixels per metre to stay crisp at reading distance, within texture limits.
  const ppm = Math.min(QUALITY.ppm, 4096 / Math.max(o.width, o.height));
  const c = document.createElement("canvas");
  c.width = Math.round(o.width * ppm);
  c.height = Math.round(o.height * ppm);
  const g = c.getContext("2d")!;
  const root = getComputedStyle(document.documentElement);
  const serif = root.getPropertyValue("--font-instrument-serif").trim() || "Georgia, serif";
  const sans = root.getPropertyValue("--font-geist-sans").trim() || "system-ui, sans-serif";
  const pad = o.padding * ppm;
  const innerW = c.width - pad * 2;
  const innerH = c.height - pad * 2;

  type Row = { text: string; x: number; y: number; line: Line; px: number };
  const setFont = (line: Line, px: number) => {
    const family = line.font === "sans" ? sans : serif;
    g.font = `${line.font === "serif-italic" ? "italic " : ""}${line.weight ?? (line.font === "sans" ? 450 : 400)} ${px}px ${family}`;
    g.letterSpacing = `${(line.tracking ?? 0) * px}px`;
  };
  const layout = (scale: number) => {
    const rows: Row[] = [];
    let y = 0;
    for (const line of o.lines) {
      let px = line.size * ppm * scale;
      setFont(line, px);
      if (line.fit) {
        const w = g.measureText(line.caps ? line.text.toUpperCase() : line.text).width;
        if (w > innerW) {
          px *= innerW / w;
          setFont(line, px);
        }
      }
      y += (line.gap ?? 0) * ppm * scale;
      const indent = line.bullet ? px * 0.9 : 0;
      const text = line.caps ? line.text.toUpperCase() : line.text;
      let row = "";
      const wrapped: string[] = [];
      for (const word of text.split(" ")) {
        const next = row ? `${row} ${word}` : word;
        if (row && !line.fit && g.measureText(next).width > innerW - indent) {
          wrapped.push(row);
          row = word;
        } else row = next;
      }
      if (row) wrapped.push(row);
      wrapped.forEach((r, i) => {
        rows.push({ text: r, x: indent, y, line: { ...line, bullet: line.bullet && i === 0 }, px });
        y += px * (line.lineHeight ?? 1.25);
      });
    }
    return { rows, height: y };
  };

  // Shrink the lettering until it fits the panel.
  let scale = 1;
  let result = layout(scale);
  for (let i = 0; i < 4 && result.height > innerH; i++) {
    scale *= (innerH / result.height) * 0.98;
    result = layout(scale);
  }

  if (o.plate) {
    const lw = Math.max(2, ppm * 0.006);
    if (o.plate.fill) {
      g.fillStyle = o.plate.fill;
      g.fillRect(0, 0, c.width, c.height);
    }
    g.strokeStyle = o.plate.stroke;
    g.lineWidth = lw;
    g.strokeRect(lw / 2, lw / 2, c.width - lw, c.height - lw);
  }

  const top = pad + (o.valign === "middle" ? (innerH - result.height) / 2 : 0);
  g.textBaseline = "top";
  for (const r of result.rows) {
    setFont(r.line, r.px);
    g.fillStyle = r.line.color ?? o.color;
    g.globalAlpha = r.line.opacity ?? 1;
    g.textAlign = o.align;
    const x = o.align === "center" ? c.width / 2 : pad + r.x;
    const y = top + r.y + r.px * 0.08;
    g.fillText(r.text, x, y);
    if (r.line.bullet) {
      g.beginPath();
      g.arc(pad + r.px * 0.25, y + r.px * 0.55, r.px * 0.1, 0, Math.PI * 2);
      g.fill();
    }
    if (r.line.strike) {
      const w = g.measureText(r.text).width;
      const sx = o.align === "center" ? x - w / 2 : x;
      g.fillRect(sx, y + r.px * 0.55, w, Math.max(1.5, r.px * 0.05));
    }
  }
  g.globalAlpha = 1;

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  // Once the lettering is on the graphics card the canvas isn't needed: free its memory
  // (browsers, iOS Safari especially, cap the total memory a page's canvases may use).
  t.onUpdate = () => {
    c.width = c.height = 0;
    t.onUpdate = null;
  };
  return t;
}

/** All the lettering near the visitor. */
function WallTexts({ radius, ...props }: MuseumProps & { layout: Layout; hereZ: number; radius: number }) {
  const { layout, hereZ } = props;
  return (
    <group>
      {layout.panels
        .filter((p) => Math.abs(p.pos[2] - hereZ) < radius)
        .map((p) => (
          <group key={`${p.kind}-${p.room}-${p.step ?? ""}-${p.id ?? ""}-${p.pos[2]}`} position={p.pos} rotation-y={p.rotY}>
            <PanelText panel={p} {...props} />
          </group>
        ))}
    </group>
  );
}

function PanelText({ panel: p, tour, answers, onAnswer, score, onRestart, onFindTaste, next, onLobby, layout }: MuseumProps & { panel: Panel; layout: Layout }) {
  const { ink, accent } = inkFor(tour, p.room);
  const k = layout.portrait ? 1.15 : 1;
  const at: [number, number, number] = [0, 0, 0.012];

  if (p.kind === "label") {
    const art = getArtwork(p.id!)!;
    const artist = getArtist(art.artist);
    const meta = [art.medium, art.dimensions, art.collection].filter(Boolean).join(" · ");
    return (
      <WallText
        width={p.width}
        height={p.height}
        position={at}
        color={ink}
        lines={[
          { text: artist?.name ?? art.culture ?? "", font: "sans", size: 0.046 * k, weight: 550 },
          ...(artist?.lifespan ? [{ text: artist.lifespan, font: "sans" as const, size: 0.036 * k, opacity: 0.55, gap: 0.006 }] : []),
          { text: art.title, font: "serif-italic", size: 0.1 * k, lineHeight: 1.1, gap: 0.05 },
          { text: art.year, font: "serif", size: 0.07 * k, opacity: 0.7, gap: 0.005 },
          { text: meta, font: "sans", size: 0.034 * k, lineHeight: 1.45, opacity: 0.6, gap: 0.04 },
          { text: art.blurb, font: "sans", size: 0.05 * k, lineHeight: 1.55, opacity: 0.92, gap: 0.08 },
          ...(art.lookCloser
            ? [
                { text: "Look closer", font: "sans" as const, size: 0.034 * k, tracking: 0.2, caps: true, color: accent, weight: 600, gap: 0.09 },
                { text: art.lookCloser, font: "serif-italic" as const, size: 0.064 * k, lineHeight: 1.35, gap: 0.02 },
              ]
            : []),
        ]}
      />
    );
  }

  if (p.kind === "room" || p.kind === "room-side") {
    const room = tour.rooms[p.room]?.info;
    if (!room) return null;
    const heading: Line[] = [
      { text: `Room ${p.room + 1} · ${room.region}`, font: "sans", size: 0.05 * k, tracking: 0.26, caps: true, opacity: 0.65 },
      { text: yearLabel(room.start), font: "serif", size: 0.36 * k, lineHeight: 1, gap: 0.08, fit: true },
      { text: `to ${yearLabel(room.end)}`, font: "sans", size: 0.05 * k, tracking: 0.26, caps: true, opacity: 0.55, gap: 0.03 },
      { text: room.name, font: "serif-italic", size: 0.16 * k, lineHeight: 1.08, gap: 0.12 },
    ];
    const summary: Line = { text: room.summary, font: "sans", size: (layout.portrait ? 0.075 : 0.062) * k, lineHeight: 1.55, opacity: 0.92 };
    const hallmarks: Line[] = [
      { text: "How to recognise it", font: "sans", size: (layout.portrait ? 0.052 : 0.04) * k, tracking: 0.2, caps: true, color: accent, weight: 600, gap: 0.14 },
      ...room.hallmarks.map((h, i) => ({
        text: h,
        font: "sans" as const,
        size: (layout.portrait ? 0.07 : 0.05) * k,
        lineHeight: 1.4,
        bullet: true,
        gap: i === 0 ? 0.04 : 0.012,
      })),
    ];
    const lines = layout.portrait ? [...heading, { ...summary, gap: 0.14 }, ...hallmarks] : p.kind === "room" ? [...heading, ...hallmarks] : [summary];
    return <WallText width={p.width} height={p.height} position={at} color={ink} lines={lines} />;
  }

  if (p.kind === "bridge") {
    const step = tour.steps[p.step!];
    const next = tour.rooms[p.room]?.info;
    if (step?.kind !== "bridge" || !next) return null;
    return (
      <WallText
        width={p.width}
        height={p.height}
        position={at}
        color={ink}
        lines={[
          { text: `On the way to room ${p.room + 1}`, font: "sans", size: 0.048 * k, tracking: 0.22, caps: true, color: accent, weight: 600 },
          { text: step.text, font: "serif-italic", size: 0.105 * k, lineHeight: 1.42, gap: 0.08 },
          { text: `${next.name} · ${yearLabel(next.start)} to ${yearLabel(next.end)}`, font: "sans", size: 0.045 * k, tracking: 0.12, caps: true, opacity: 0.6, gap: 0.12 },
        ]}
      />
    );
  }

  if (p.kind === "quiz") return <RoomQuiz panel={p} tour={tour} answer={answers[p.step!]} onAnswer={(m) => onAnswer(p.step!, m)} ink={ink} accent={accent} k={k} />;

  if (p.kind === "question") {
    const step = tour.steps[p.step!];
    if (step?.kind !== "quiz" || step.format !== "work") return null;
    const answer = answers[p.step!];
    const right = getMovement(step.answer)!;
    return (
      <WallText
        width={p.width}
        height={p.height}
        position={at}
        align="center"
        color={ink}
        lines={[
          { text: "Test your eye", font: "sans", size: 0.06 * k, tracking: 0.22, caps: true, color: accent, weight: 600 },
          { text: `Which of these belongs in ${right.name}?`, font: "serif", size: 0.22 * k, lineHeight: 1.1, gap: 0.05 },
          answer
            ? { text: verdict(step.correctId, answer === step.correctId, right.name, right.hallmarks), font: "sans", size: 0.085 * k, lineHeight: 1.45, gap: 0.07, opacity: 0.9 }
            : { text: "Click the work on the wall.", font: "sans", size: 0.085 * k, gap: 0.07, opacity: 0.6 },
        ]}
      />
    );
  }

  // The closing wall.
  const first = tour.rooms[0]?.info;
  const last = tour.rooms[tour.rooms.length - 1]?.info;
  if (!first || !last) return null;
  const n = tour.rooms.length;
  const buttonW = layout.portrait ? 1.5 : 2.2;
  const buttonH = layout.portrait ? 0.3 : 0.28;
  const buttonY = -p.height / 2 + buttonH / 2;
  return (
    <>
      <WallText
        width={p.width}
        height={p.height - buttonH - 0.15}
        position={[0, (buttonH + 0.15) / 2, 0.012]}
        align="center"
        color="#efe9dc"
        lines={[
          { text: "Exit", font: "sans", size: 0.07 * k, tracking: 0.35, caps: true, opacity: 0.55 },
          { text: `You walked from ${yearLabel(first.start)} to ${yearLabel(last.end)}.`, font: "serif-italic", size: 0.3 * k, lineHeight: 1.1, gap: 0.12 },
          {
            text: `${n} ${n === 1 ? "room" : "rooms"}${score.total > 0 ? ` · you placed ${score.right} of ${score.total} works in the right room` : ""}.`,
            font: "sans",
            size: 0.085 * k,
            gap: 0.12,
            opacity: 0.7,
          },
        ]}
      />
      <WallText
        width={buttonW}
        height={buttonH}
        position={[-(buttonW / 2 + 0.08), buttonY, 0.012]}
        align="center"
        valign="middle"
        color="#efe9dc"
        plate={{ stroke: "rgba(239,233,220,0.8)" }}
        padding={0.08}
        onClick={next ? next.go : onFindTaste}
        lines={[{ text: next ? `Continue to ${next.name}` : "Now find your own taste", font: "sans", size: 0.06 * k, tracking: 0.14, caps: true, weight: 550, fit: true }]}
      />
      <WallText
        width={buttonW}
        height={buttonH}
        position={[buttonW / 2 + 0.08, buttonY, 0.012]}
        align="center"
        valign="middle"
        color="#efe9dc"
        plate={{ stroke: "rgba(239,233,220,0.3)" }}
        padding={0.08}
        onClick={onLobby ?? onRestart}
        lines={[{ text: onLobby ? "Back to the entrance hall" : "Walk it again", font: "sans", size: 0.06 * k, tracking: 0.14, caps: true, opacity: 0.75, fit: true }]}
      />
    </>
  );
}

/** What a test's answer teaches, once given. */
function verdict(id: string, ok: boolean, roomName: string, hallmarks: string[]) {
  const art = getArtwork(id)!;
  const by = getArtist(art.artist)?.name ?? art.culture;
  const giveaway = hallmarks
    .slice(0, 2)
    .map((h) => h.charAt(0).toLowerCase() + h.slice(1))
    .join(", and ");
  return `${ok ? "Well seen." : `Not quite. This is ${roomName}.`} It is ${art.title} by ${by}, ${art.year}. The giveaway: ${giveaway}.`;
}

/** "Which room does this work belong in?", lettered beside the work, answered by touching a room's name. */
function RoomQuiz({
  panel: p,
  tour,
  answer,
  onAnswer,
  ink,
  accent,
  k,
}: {
  panel: Panel;
  tour: Tour;
  answer?: string;
  onAnswer: (m: string) => void;
  ink: string;
  accent: string;
  k: number;
}) {
  const step = tour.steps[p.step!];
  if (step?.kind !== "quiz" || step.format !== "room") return null;
  const right = getMovement(step.answer)!;
  const top = p.height / 2;
  const qH = 0.42 * k;
  const optH = 0.17 * k;
  const optGap = 0.05;
  // Once answered, only the right room (and a wrong pick) stay, to make room for the explanation.
  const options = answer ? step.options.filter((m) => m === step.answer || m === answer) : step.options;
  const optionsBottom = top - qH - options.length * (optH + optGap);
  const feedbackH = optionsBottom + p.height / 2 - 0.06;

  return (
    <>
      <WallText
        width={p.width}
        height={qH}
        position={[0, top - qH / 2, 0.012]}
        color={ink}
        lines={[
          { text: "Test your eye", font: "sans", size: 0.042 * k, tracking: 0.22, caps: true, color: accent, weight: 600 },
          { text: "Which room does this work belong in?", font: "serif", size: 0.1 * k, lineHeight: 1.1, gap: 0.03 },
        ]}
      />
      {options.map((m, i) => {
        const mv = getMovement(m)!;
        const state = !answer ? "idle" : m === step.answer ? "right" : m === answer ? "wrong" : "other";
        return (
          <WallText
            key={m}
            width={p.width}
            height={optH}
            position={[0, top - qH - i * (optH + optGap) - optH / 2, 0.012]}
            valign="middle"
            padding={0.05}
            color={state === "right" ? accent : ink}
            plate={{
              stroke: state === "right" ? accent : state === "idle" ? `${ink}99` : `${ink}33`,
              fill: state === "right" ? `${accent}22` : undefined,
            }}
            onClick={answer ? undefined : () => onAnswer(m)}
            lines={[
              {
                // Dates would give the answer away, so they appear only afterwards.
                text: answer ? `${mv.name}  ·  ${yearLabel(mv.start)} to ${yearLabel(mv.end)}` : mv.name,
                font: "sans",
                size: 0.052 * k,
                weight: state === "right" ? 600 : 450,
                opacity: state === "wrong" || state === "other" ? 0.45 : 1,
                strike: state === "wrong",
                fit: true,
              },
            ]}
          />
        );
      })}
      {answer && feedbackH > 0.2 && (
        <WallText
          width={p.width}
          height={feedbackH}
          position={[0, optionsBottom - 0.06 - feedbackH / 2, 0.012]}
          color={ink}
          lines={[{ text: verdict(step.id, answer === step.answer, right.name, right.hallmarks), font: "sans", size: 0.05 * k, lineHeight: 1.5, opacity: 0.92 }]}
        />
      )}
    </>
  );
}

/* ----------------------------------------------------------------- camera */

/**
 * How far along a move you are at time t (both 0 to 1): easing up to a steady
 * glide within the first `rise` of the time and easing out over the last `fall`,
 * with no sudden change of speed anywhere.
 */
function glide(t: number, rise: number, fall: number) {
  const v = 1 / (1 - rise / 2 - fall / 2); // the steady speed
  if (t < rise) return (v / 2) * (t - (rise / Math.PI) * Math.sin((Math.PI * t) / rise));
  if (t > 1 - fall) {
    const r = 1 - t;
    return 1 - (v / 2) * (r - (fall / Math.PI) * Math.sin((Math.PI * r) / fall));
  }
  return v * (t - rise / 2);
}

/** An opening in a wall across the hall: the wall's z, and the lane through it. */
export type Door = { z: number; x: number; lane: number };

/**
 * The way between two spots in one hall (its own coordinates): straight if
 * nothing is in the way, otherwise through every doorway in between, passing
 * straight through each opening rather than clipping its edge.
 */
export function waypoints(from: THREE.Vector3, to: THREE.Vector3, doors: Door[]) {
  const points = [from.clone()];
  const lo = Math.min(from.z, to.z);
  const hi = Math.max(from.z, to.z);
  const crossed = doors.filter((d) => d.z > lo + 0.2 && d.z < hi - 0.2);
  // In the order you reach them.
  crossed.sort((a, b) => (to.z < from.z ? b.z - a.z : a.z - b.z));
  const dir = Math.sign(to.z - from.z);
  for (const d of crossed) {
    // Where the straight line would cross, pulled into the doorway.
    const f = (d.z - from.z) / (to.z - from.z);
    const x = Math.max(d.x - d.lane, Math.min(d.x + d.lane, from.x + (to.x - from.x) * f));
    points.push(new THREE.Vector3(x, HALL.eye, d.z - dir * 1.1), new THREE.Vector3(x, HALL.eye, d.z + dir * 1.1));
  }
  points.push(to.clone());
  return points;
}

/** The camera's field of view: wider on a tall, narrow screen. */
export const fovFor = (aspect: number) => (aspect < 1 ? 64 : 50);

/**
 * Moves the camera to a pose in one smooth glide along the way `plan` gives
 * (through doorways, never through walls), turning as it goes to face what it
 * came to see. The very first pose is reached from `start`. On arrival it
 * holds perfectly still.
 */
export function GlideTo({
  pose,
  plan,
  start,
  onArrive,
}: {
  pose?: Pose;
  plan: (from: THREE.Vector3, to: THREE.Vector3) => THREE.Vector3[];
  start?: Pose;
  onArrive?: () => void;
}) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const fov = fovFor(size.width / size.height);
  // Only a new pose starts a new move; these just need to be current when it does.
  const latest = useRef({ onArrive, plan, start });
  useEffect(() => {
    latest.current = { onArrive, plan, start };
  }, [onArrive, plan, start]);
  const anim = useRef<{
    path: THREE.Curve<THREE.Vector3>;
    fromTurn: THREE.Quaternion;
    look: THREE.Vector3;
    start: number;
    duration: number;
    /** A long way (to another exhibition): look where you're going on the way. */
    long: boolean;
    arrived: boolean;
  } | null>(null);
  const initialised = useRef(false);

  useEffect(() => {
    if (!pose) return;
    const toPos = new THREE.Vector3(...pose.pos);
    const look = new THREE.Vector3(...pose.look);
    if (!initialised.current) {
      // Start a little way back (or where asked) and glide in.
      initialised.current = true;
      const from = latest.current.start ?? { pos: [pose.pos[0], HALL.eye, pose.pos[2] + 7] as Vec3, look: pose.look };
      camera.position.set(...from.pos);
      camera.lookAt(...from.look);
    }
    // Drop points that fall on top of each other, then follow the rest smoothly.
    const points = latest.current.plan(camera.position.clone(), toPos).filter((p, i, all) => i === 0 || p.distanceTo(all[i - 1]) > 0.05);
    if (points.length < 2) points.push(toPos.clone());
    const path = points.length === 2 ? new THREE.LineCurve3(points[0], points[1]) : new THREE.CatmullRomCurve3(points, false, "centripetal");
    const length = path.getLength();
    const turn = camera.quaternion.angleTo(facing(toPos, look));
    // A brisk glide, straight there; a short one for moving close or back; a long
    // way (on to another exhibition) takes a little longer, though not much.
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const step = length < 2.5;
    const cap = length > 40 ? 6 : 3.5;
    const duration = still ? 0.4 : step ? Math.max(1, turn * 0.5) : Math.min(cap, Math.max(1.2, length / 4.5 + turn * 0.25));
    anim.current = {
      path,
      fromTurn: camera.quaternion.clone(),
      look,
      start: performance.now(),
      duration: duration * 1000,
      long: length > 40,
      arrived: false,
    };
  }, [pose, camera]);

  useFrame((state) => {
    const cam = state.camera as THREE.PerspectiveCamera;
    if (cam.fov !== fov) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    const a = anim.current;
    if (!a) return;
    const t = Math.min(1, (performance.now() - a.start) / a.duration);
    // Standing still once there: nothing moves while you look or read.
    if (a.arrived) return;
    // Easing into a glide within about 0.35 s, and out of it over the last 0.7 s.
    const seconds = a.duration / 1000;
    const k = glide(t, Math.min(0.3, 0.35 / seconds), Math.min(0.45, 0.7 / seconds));
    const p = a.path.getPointAt(k);
    camera.position.copy(p);
    // Turning flows with the move, settling as it ends.
    const turned = 0.5 - Math.cos(Math.PI * t) / 2;
    camera.quaternion.slerpQuaternions(a.fromTurn, facing(p, a.look), turned);
    if (a.long) {
      // On a long way, face along it in between, through the doorways and halls.
      const ahead = p.clone().add(a.path.getTangentAt(Math.min(0.999, k)).setY(0).normalize().multiplyScalar(6));
      ahead.y = HALL.eye;
      camera.quaternion.slerp(facing(p, ahead), Math.min(1, t / 0.15, (1 - t) / 0.25));
    }
    if (t === 1) {
      a.arrived = true;
      latest.current.onArrive?.();
    }
  });

  return null;
}

/** The camera's orientation standing at `from`, looking at `at`. */
function facing(from: THREE.Vector3, at: THREE.Vector3) {
  const m = new THREE.Matrix4().lookAt(from, at, new THREE.Vector3(0, 1, 0));
  return new THREE.Quaternion().setFromRotationMatrix(m);
}
