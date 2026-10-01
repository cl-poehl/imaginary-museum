"use client";

// The works themselves, as objects in the room.
//
// Paintings hang in moulded frames, chosen as a museum would: carved gilt for
// the Baroque, black ebony for the Dutch, a Renaissance cassetta, plain strips
// for the moderns, a mount for prints, silk and rollers for a Chinese scroll.
// Each style has variants, picked per work, so neighbours differ.
//
// Sculptures and objects are their photograph, cut out of its background
// (scripts/sculpt.mjs), standing in a lit niche behind glass.

import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { getArtwork } from "@/data";
import { nicheFor } from "@/lib/display";
import type { Hung } from "@/lib/museum-layout";

/* -------------------------------------------------------------- materials */

const M = {
  gold: new THREE.MeshStandardMaterial({ color: "#c49a45", metalness: 0.9, roughness: 0.3 }),
  goldPale: new THREE.MeshStandardMaterial({ color: "#dcc07a", metalness: 0.85, roughness: 0.28 }),
  goldDark: new THREE.MeshStandardMaterial({ color: "#8f6b2e", metalness: 0.85, roughness: 0.42 }),
  ebony: new THREE.MeshStandardMaterial({ color: "#100e0c", metalness: 0.2, roughness: 0.25 }),
  black: new THREE.MeshStandardMaterial({ color: "#191714", roughness: 0.75 }),
  walnut: new THREE.MeshStandardMaterial({ color: "#4a3223", roughness: 0.55 }),
  oak: new THREE.MeshStandardMaterial({ color: "#8c6b46", roughness: 0.65 }),
  white: new THREE.MeshStandardMaterial({ color: "#e7e2d6", roughness: 0.6 }),
  mount: new THREE.MeshStandardMaterial({ color: "#ebe4d2", roughness: 0.95 }),
  silk: new THREE.MeshStandardMaterial({ color: "#7a6c50", roughness: 0.85 }),
  silkPale: new THREE.MeshStandardMaterial({ color: "#c9bb93", roughness: 0.85 }),
  roller: new THREE.MeshStandardMaterial({ color: "#2e2217", roughness: 0.45 }),
  glass: new THREE.MeshStandardMaterial({ color: "#ffffff", metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.1, depthWrite: false }),
};
type Mat = keyof typeof M;

/**
 * Reflections for the gilding and the glass: a soft studio room, made on the
 * spot (nothing downloaded), given only to the materials that need it.
 */
export function FrameReflections() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    for (const m of [M.gold, M.goldPale, M.goldDark, M.ebony, M.glass]) {
      m.envMap = env;
      m.envMapIntensity = m === M.ebony ? 0.5 : 0.9;
      m.needsUpdate = true;
    }
    return () => {
      env.dispose();
      pmrem.dispose();
    };
  }, [gl]);
  return null;
}

/* ----------------------------------------------------------------- frames */

/** One moulding in a frame, listed from the picture outward: width, depth and rounding (m). */
type Ring = { w: number; d: number; b: number; m: Mat };
type Style = { rings: Ring[]; mount?: number; scroll?: boolean; rod?: boolean };

const STYLES: Record<string, Style> = {
  "gilt-baroque": {
    rings: [
      { w: 0.02, d: 0.05, b: 0.008, m: "goldPale" },
      { w: 0.05, d: 0.085, b: 0.02, m: "gold" },
      { w: 0.06, d: 0.06, b: 0.012, m: "goldDark" },
      { w: 0.045, d: 0.1, b: 0.022, m: "gold" },
    ],
  },
  "gilt-simple": {
    rings: [
      { w: 0.015, d: 0.04, b: 0.006, m: "goldPale" },
      { w: 0.05, d: 0.06, b: 0.018, m: "gold" },
      { w: 0.025, d: 0.075, b: 0.012, m: "gold" },
    ],
  },
  cassetta: {
    rings: [
      { w: 0.02, d: 0.055, b: 0.008, m: "gold" },
      { w: 0.1, d: 0.035, b: 0.003, m: "black" },
      { w: 0.025, d: 0.06, b: 0.01, m: "gold" },
    ],
  },
  "cassetta-gilt": {
    rings: [
      { w: 0.02, d: 0.055, b: 0.008, m: "goldPale" },
      { w: 0.1, d: 0.035, b: 0.003, m: "goldDark" },
      { w: 0.025, d: 0.06, b: 0.01, m: "gold" },
    ],
  },
  tabernacle: {
    rings: [
      { w: 0.03, d: 0.05, b: 0.01, m: "goldPale" },
      { w: 0.12, d: 0.04, b: 0.004, m: "gold" },
      { w: 0.035, d: 0.075, b: 0.015, m: "goldDark" },
    ],
  },
  ebony: {
    rings: [
      { w: 0.02, d: 0.05, b: 0.008, m: "ebony" },
      { w: 0.06, d: 0.065, b: 0.02, m: "ebony" },
      { w: 0.03, d: 0.08, b: 0.012, m: "ebony" },
    ],
  },
  "ebony-gilt": {
    rings: [
      { w: 0.012, d: 0.04, b: 0.005, m: "gold" },
      { w: 0.07, d: 0.065, b: 0.02, m: "ebony" },
      { w: 0.025, d: 0.08, b: 0.01, m: "ebony" },
    ],
  },
  "white-gold": {
    rings: [
      { w: 0.015, d: 0.04, b: 0.006, m: "gold" },
      { w: 0.07, d: 0.05, b: 0.015, m: "white" },
      { w: 0.015, d: 0.06, b: 0.006, m: "gold" },
    ],
  },
  walnut: {
    rings: [
      { w: 0.012, d: 0.035, b: 0.004, m: "goldDark" },
      { w: 0.06, d: 0.05, b: 0.012, m: "walnut" },
    ],
  },
  "strip-black": { rings: [{ w: 0.025, d: 0.055, b: 0.003, m: "black" }] },
  "strip-oak": { rings: [{ w: 0.03, d: 0.05, b: 0.004, m: "oak" }] },
  "strip-white": { rings: [{ w: 0.025, d: 0.05, b: 0.003, m: "white" }] },
  secession: {
    rings: [
      { w: 0.01, d: 0.03, b: 0.002, m: "black" },
      { w: 0.09, d: 0.03, b: 0.002, m: "goldPale" },
      { w: 0.01, d: 0.035, b: 0.002, m: "black" },
    ],
  },
  "mount-oak": { mount: 0.12, rings: [{ w: 0.025, d: 0.045, b: 0.004, m: "oak" }] },
  "mount-black": { mount: 0.1, rings: [{ w: 0.022, d: 0.045, b: 0.003, m: "black" }] },
  scroll: { scroll: true, rings: [] },
  hanging: { rod: true, rings: [] },
};

const BY_MOVEMENT: Record<string, string[]> = {
  "medieval-europe": ["tabernacle", "gilt-simple", "cassetta-gilt"],
  "song-landscape": ["scroll"],
  "italian-renaissance": ["cassetta", "cassetta-gilt", "tabernacle"],
  "northern-renaissance": ["ebony-gilt", "gilt-simple", "ebony"],
  baroque: ["gilt-baroque", "gilt-baroque", "ebony-gilt"],
  "dutch-golden-age": ["ebony", "ebony-gilt", "gilt-simple"],
  romanticism: ["gilt-baroque", "gilt-simple"],
  "ukiyo-e": ["mount-oak", "mount-black"],
  impressionism: ["gilt-simple", "white-gold", "gilt-baroque"],
  "post-impressionism": ["white-gold", "walnut", "gilt-simple"],
  "vienna-secession": ["secession", "gilt-simple"],
  expressionism: ["walnut", "strip-black", "strip-oak"],
  "early-abstraction": ["strip-black", "strip-white", "strip-oak"],
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** The frame a work would get in a museum: by what it is, then by its period. */
export function frameStyle(id: string): Style {
  const a = getArtwork(id);
  const pick = (names: string[]) => STYLES[names[hash(id) % names.length]];
  if (!a) return STYLES["gilt-simple"];
  if (a.kind === "textile") return STYLES.hanging;
  if (a.kind === "print" || a.kind === "drawing" || a.kind === "manuscript") return pick(["mount-oak", "mount-black"]);
  return pick(BY_MOVEMENT[a.movement] ?? ["gilt-simple", "walnut", "strip-oak"]);
}

/** A rectangular moulding around a w × h opening, `width` wide, standing `depth` off the wall. */
function ringGeometry(w: number, h: number, width: number, depth: number, bevel: number) {
  const b = Math.min(bevel, width * 0.45, depth * 0.45);
  const ox = w / 2 + width - b;
  const oy = h / 2 + width - b;
  const ix = w / 2 + b;
  const iy = h / 2 + b;
  const shape = new THREE.Shape();
  shape.moveTo(-ox, -oy);
  shape.lineTo(ox, -oy);
  shape.lineTo(ox, oy);
  shape.lineTo(-ox, oy);
  shape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-ix, -iy);
  hole.lineTo(-ix, iy);
  hole.lineTo(ix, iy);
  hole.lineTo(ix, -iy);
  hole.closePath();
  shape.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.001, depth - 2 * b),
    bevelEnabled: b > 0,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 3,
    curveSegments: 1,
  });
  g.translate(0, 0, b);
  return g;
}

/** A soft shadow for the wall behind a frame or object. */
const shadowTexture = (() => {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  g.filter = "blur(14px)";
  g.fillStyle = "rgba(0,0,0,0.9)";
  g.fillRect(24, 24, 80, 80);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();

/** A painting, print or textile in its frame, mount or hanging. */
export function FramedWork({ hung, texture }: { hung: Hung; texture: THREE.Texture | null }) {
  const { width: w, height: h, id } = hung;
  const style = frameStyle(id);
  // Frames scale a little with the picture, as real ones do.
  const s = Math.min(1.25, Math.max(0.6, Math.sqrt(w * h) / 1.4));
  const mount = (style.mount ?? 0) * s;

  const rings = useMemo(
    () =>
      style.rings.map((r, i) => {
        // Each moulding starts where the ones inside it end.
        const inset = mount + style.rings.slice(0, i).reduce((sum, q) => sum + q.w * s, 0);
        return { geo: ringGeometry(w + inset * 2, h + inset * 2, r.w * s, r.d * s, r.b * s), m: M[r.m] };
      }),
    [style, w, h, s, mount],
  );
  useEffect(() => () => rings.forEach((r) => r.geo.dispose()), [rings]);

  const outer = mount + style.rings.reduce((sum, r) => sum + r.w * s, 0);
  const art = texture ? <meshBasicMaterial key="art" map={texture} color="#ffffff" toneMapped={false} /> : <meshBasicMaterial key="blank" color="#1c1a17" />;

  if (style.scroll) {
    // A hanging scroll: silk borders, a paler inner frame, a roller at the foot and a stick at the top.
    const top = h * 0.32 + 0.12;
    const foot = h * 0.16 + 0.08;
    const side = 0.07;
    return (
      <group>
        <mesh position={[0, (top - foot) / 2, 0.004]}>
          <planeGeometry args={[w + side * 2, h + top + foot]} />
          <primitive object={M.silk} attach="material" />
        </mesh>
        <mesh position={[0, 0, 0.006]}>
          <planeGeometry args={[w + 0.03, h + 0.03]} />
          <primitive object={M.silkPale} attach="material" />
        </mesh>
        <mesh position={[0, 0, 0.008]}>
          <planeGeometry args={[w, h]} />
          {art}
        </mesh>
        <mesh position={[0, -h / 2 - foot, 0.03]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.028, 0.028, w + side * 2 + 0.16, 20]} />
          <primitive object={M.roller} attach="material" />
        </mesh>
        <mesh position={[0, h / 2 + top, 0.018]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.012, 0.012, w + side * 2, 12]} />
          <primitive object={M.roller} attach="material" />
        </mesh>
      </group>
    );
  }

  return (
    <group>
      {shadowTexture && (
        <mesh position={[0, -0.04, 0.001]} raycast={() => null}>
          <planeGeometry args={[(w / 2 + outer) * 2 * 1.35, (h / 2 + outer) * 2 * 1.35]} />
          <meshBasicMaterial map={shadowTexture} transparent opacity={0.55} depthWrite={false} />
        </mesh>
      )}
      {style.rod && (
        <mesh position={[0, h / 2 + 0.03, 0.03]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.018, 0.018, w + 0.2, 16]} />
          <primitive object={M.roller} attach="material" />
        </mesh>
      )}
      {mount > 0 && (
        <mesh position={[0, 0, 0.008]}>
          <planeGeometry args={[w + mount * 2, h + mount * 2]} />
          <primitive object={M.mount} attach="material" />
        </mesh>
      )}
      <mesh position={[0, 0, mount > 0 ? 0.012 : 0.01]}>
        <planeGeometry args={[w, h]} />
        {art}
      </mesh>
      {rings.map((r, i) => (
        <mesh key={i} geometry={r.geo} material={r.m} />
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ niches */

/** A vertical wash of light, top to bottom, for the inside of a niche. */
function wash(top: string, bottom: string) {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 256;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A soft glow, for the spotlight on a niche's back wall and the shadow under its object. */
function blob(color: string) {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, color);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// The inside of every niche: dark, warm and lit from above, so the object stands out.
const NICHE = {
  back: new THREE.MeshBasicMaterial({ map: wash("#5f5850", "#2b2723"), toneMapped: false }),
  side: new THREE.MeshBasicMaterial({ map: wash("#4a443d", "#221f1b"), toneMapped: false }),
  floor: new THREE.MeshBasicMaterial({ color: "#3b3631", toneMapped: false }),
  light: new THREE.MeshBasicMaterial({ color: "#fff6e4", toneMapped: false }),
  spot: new THREE.MeshBasicMaterial({ map: blob("rgba(255,236,205,0.55)"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
  shadow: new THREE.MeshBasicMaterial({ map: blob("rgba(0,0,0,0.7)"), transparent: true, depthWrite: false }),
  base: new THREE.MeshStandardMaterial({ color: "#d9d4c9", roughness: 0.9 }),
  trim: new THREE.MeshStandardMaterial({ color: "#5a4a33", metalness: 0.6, roughness: 0.4 }),
  shell: new THREE.MeshStandardMaterial({ color: "#26231f", roughness: 0.7 }),
};

/**
 * A sculpture or object: its photograph, cut out of the background, standing on a
 * low base in a lit niche behind glass. In the wall (the wall around it has a
 * matching opening), or as a "vitrine", the same box brought forward as a case.
 */
export function CutOutWork({ hung, load }: { hung: Hung; load: boolean }) {
  const { id, width: w, height: h, mount } = hung;
  const { width: W, height: H, depth: D } = nicheFor(w, h);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!load || texture) return;
    let alive = true;
    new THREE.TextureLoader()
      .loadAsync(`/sculpt/${id}.webp`)
      .then((t) => {
        if (!alive) return t.dispose();
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        setTexture(t);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [load, texture, id]);

  const floor = -H / 2;
  const baseH = 0.07;
  const at = -D * 0.5; // the object stands mid-way back
  const trim = 0.05;

  return (
    <group position={[0, 0, mount === "vitrine" ? D : 0]}>
      {/* The niche: back, sides, ceiling with its light, and floor. */}
      <mesh position={[0, 0, -D]} material={NICHE.back}>
        <planeGeometry args={[W, H]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * W) / 2, 0, -D / 2]} rotation-y={-s * (Math.PI / 2)} material={NICHE.side}>
          <planeGeometry args={[D, H]} />
        </mesh>
      ))}
      <mesh position={[0, H / 2, -D / 2]} rotation-x={Math.PI / 2} material={NICHE.side}>
        <planeGeometry args={[W, D]} />
      </mesh>
      <mesh position={[0, H / 2 - 0.004, -D / 2]} rotation-x={Math.PI / 2} material={NICHE.light}>
        <planeGeometry args={[W * 0.6, 0.12]} />
      </mesh>
      <mesh position={[0, floor, -D / 2]} rotation-x={-Math.PI / 2} material={NICHE.floor}>
        <planeGeometry args={[W, D]} />
      </mesh>
      {/* The light falling on the back wall behind the object. */}
      <mesh position={[0, floor + h * 0.65, -D + 0.005]} material={NICHE.spot} raycast={() => null}>
        <planeGeometry args={[w * 1.5 + 0.4, h * 1.3 + 0.3]} />
      </mesh>

      {/* The object on its low base, with a soft shadow. */}
      <mesh position={[0, floor + baseH / 2, at]} material={NICHE.base}>
        <boxGeometry args={[Math.min(w * 0.8 + 0.12, W - 0.12), baseH, 0.4]} />
      </mesh>
      <mesh position={[0, floor + baseH + 0.002, at]} rotation-x={-Math.PI / 2} material={NICHE.shadow} raycast={() => null}>
        <planeGeometry args={[w * 0.9, 0.32]} />
      </mesh>
      {texture && (
        <mesh position={[0, floor + baseH + h / 2, at]}>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial map={texture} transparent alphaTest={0.4} toneMapped={false} />
        </mesh>
      )}

      {/* Glass across the opening, and a bronze trim round it. */}
      <mesh position={[0, 0, -0.01]} material={M.glass} raycast={() => null}>
        <planeGeometry args={[W, H]} />
      </mesh>
      {[
        [0, H / 2 + trim / 2, W + trim * 2, trim],
        [0, -H / 2 - trim / 2, W + trim * 2, trim],
        [-W / 2 - trim / 2, 0, trim, H],
        [W / 2 + trim / 2, 0, trim, H],
      ].map(([x, y, bw, bh], i) => (
        <mesh key={i} position={[x, y, 0.012]} material={NICHE.trim}>
          <boxGeometry args={[bw, bh, 0.03]} />
        </mesh>
      ))}

      {/* A case standing out from the wall needs an outside. */}
      {mount === "vitrine" &&
        [
          [0, H / 2 + 0.02, W + 0.04, 0.04],
          [0, -H / 2 - 0.02, W + 0.04, 0.04],
          [-W / 2 - 0.02, 0, 0.04, H],
          [W / 2 + 0.02, 0, 0.04, H],
        ].map(([x, y, bw, bh], i) => (
          <mesh key={`s${i}`} position={[x, y, -D / 2]} material={NICHE.shell}>
            <boxGeometry args={[bw, bh, D]} />
          </mesh>
        ))}
    </group>
  );
}
