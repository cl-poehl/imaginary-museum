// How each work is shown in the 3D museum. Paintings, prints and the like hang
// in frames. Sculptures and objects are shown as their photograph, cut out of
// its background (scripts/sculpt.mjs), standing in a lit niche set into the
// wall behind a pane of glass; where a wall can't take a niche (the entrance
// hall's piers), in a glass case fixed to it.

import { getArtwork } from "@/data";
import sculptData from "@/data/sculpt.json";

type CutOut = { aspect: number; fill: number };
const CUT_OUTS = sculptData as Record<string, CutOut>;

export type Mount = "frame" | "niche" | "vitrine";

export type Display = { mount: Mount; width: number; height: number };

/** Sculptures and objects have a cut-out photograph. */
export const isCutOut = (id: string) => id in CUT_OUTS;

/** The niche around a cut-out of this size: its opening, and how deep it goes. */
export const nicheFor = (width: number, height: number) => ({ width: width + 0.5, height: height + 0.45, depth: 0.8 });

// The few works whose labels give no dimensions: height and width in metres.
const KNOWN_SIZE: Record<string, { h: number; w?: number }> = {
  "ishtar-gate": { h: 14.7 }, // the Pergamon reconstruction
  "benin-bronzes": { h: 0.45 }, // a typical plaque
  "the-lady-and-the-unicorn": { h: 3.7 },
  "farnese-atlas": { h: 2.1 },
  "lion-hunt-of-ashurbanipal": { h: 1.6 }, // one panel
};

const UNIT = { mm: 0.001, cm: 0.01, m: 1 } as const;

/**
 * The work's real size in metres from its label: "77 × 53 cm" (height × width),
 * "H. 208 cm", "L. 54 cm", "Diam. 360 cm", "50 cm × 68.3 m", "H. 20 m, L. 73 m".
 */
export function realSize(id: string): { h?: number; w?: number } | null {
  if (KNOWN_SIZE[id]) return KNOWN_SIZE[id];
  const text = getArtwork(id)?.dimensions ?? "";
  const tokens = [...text.matchAll(/(H\.|L\.|W\.|Diam\.)?\s*(?:c\.\s*)?([\d.,]+)(?:\s*[–-]\s*[\d.,]+)?\s*(mm|cm|m)?\b/g)].map((m) => ({
    label: m[1],
    value: parseFloat(m[2].replace(",", "")),
    unit: m[3] as keyof typeof UNIT | undefined,
  }));
  if (!tokens.length) return null;
  // "77 × 53 cm": a number without a unit takes the next one's.
  tokens.forEach((t, i) => (t.unit ??= tokens.slice(i + 1).find((u) => u.unit)?.unit ?? "cm"));
  const size: { h?: number; w?: number } = {};
  const plain: number[] = [];
  for (const t of tokens) {
    const v = t.value * UNIT[t.unit!];
    if (t.label === "H.") size.h ??= v;
    else if (t.label === "L." || t.label === "W.") size.w ??= v;
    else if (t.label === "Diam.") {
      size.h ??= v;
      size.w ??= v;
    } else plain.push(v);
  }
  size.h ??= plain[0];
  size.w ??= plain[1];
  return size.h || size.w ? size : null;
}

/**
 * The size and mount for a work: its real size, kept within the space it's
 * given (maxH × maxW, including a niche's surround). `inWall` says whether
 * this wall can take a niche.
 */
export function displayFor(id: string, maxH: number, maxW: number, inWall = true): Display {
  const a = getArtwork(id)!;
  const cut = CUT_OUTS[id];
  const aspect = cut?.aspect ?? a.image.width / a.image.height;
  const real = realSize(id);
  // Proportions come from the picture (a photograph may show a detail); scale from the label.
  let height = real?.h ?? (real?.w ? real.w / aspect : 1);
  if (!real) height = cut ? 0.8 : 1;
  let width = height * aspect;
  // Too large for the room: scaled down to fit. Very small: just large enough to make out.
  const padH = cut ? 0.45 : 0;
  const padW = cut ? 0.5 : 0;
  const shrink = Math.min(1, (maxH - padH) / height, (maxW - padW) / width);
  height *= shrink;
  width *= shrink;
  if (height < 0.15 && width < 0.15) {
    const grow = 0.15 / Math.max(height, width);
    height *= grow;
    width *= grow;
  }
  return { mount: cut ? (inWall ? "niche" : "vitrine") : "frame", width, height };
}

/** The wall a work takes up: the picture, or its niche's opening. */
export const footprintOf = (d: { mount: Mount; width: number; height: number }) =>
  d.mount === "frame" ? { width: d.width, height: d.height } : nicheFor(d.width, d.height);
