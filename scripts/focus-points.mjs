// Finds the main face in every work, so the tour's close-up can begin there.
// Uses OWL-ViT zero-shot detection ("a human face") on the cached thumbnails.
// Writes src/data/focus.json: { id: { x, y, h } } with the face centre and
// height as fractions of the image. Works without a clear face are left out.
// Usage: node scripts/focus-points.mjs  (after scripts/embed-images.mjs has cached images)
import fs from "node:fs";
import path from "node:path";
import { pipeline, env } from "@huggingface/transformers";

process.removeAllListeners("warning");
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
env.cacheDir = path.join(ROOT, "scripts/.cache/models");

const { ARTWORK_ENTRIES } = await import("../src/data/artworks.ts");
const famous = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/famous.json"), "utf8"));
const works = [
  ...ARTWORK_ENTRIES.map((w) => ({ id: w.id, file: path.join(ROOT, "scripts/.cache/img/curated", `${w.id}.jpg`) })),
  ...famous.artworks.map((w) => ({ id: w.id, file: path.join(ROOT, "scripts/.cache/img/famous", `${w.id}.jpg`) })),
];

const detector = await pipeline("zero-shot-object-detection", "Xenova/owlvit-base-patch32");
const out = {};
let found = 0;
for (const w of works) {
  if (!fs.existsSync(w.file)) continue;
  const hits = await detector(w.file, ["a human face"], { threshold: 0.06, percentage: true });
  // Prefer confident, larger, more central faces: the protagonist, not a face
  // in the crowd or at the edge.
  const weight = (d) => {
    const cx = (d.box.xmin + d.box.xmax) / 2;
    return d.score * Math.sqrt(d.area) * (1.25 - Math.abs(cx - 0.5));
  };
  const best = hits
    .map((d) => ({ ...d, area: (d.box.xmax - d.box.xmin) * (d.box.ymax - d.box.ymin) }))
    .sort((a, b) => weight(b) - weight(a))[0];
  if (!best) continue;
  const r = (v) => Math.round(v * 1000) / 1000;
  out[w.id] = { x: r((best.box.xmin + best.box.xmax) / 2), y: r((best.box.ymin + best.box.ymax) / 2), h: r(best.box.ymax - best.box.ymin) };
  found++;
}
fs.writeFileSync(path.join(ROOT, "src/data/focus.json"), JSON.stringify(out) + "\n");
console.log(`faces found in ${found} of ${works.length} works`);
for (const id of ["mona-lisa", "night-watch", "the-kiss", "the-scream", "laocoon-and-his-sons", "las-meninas", "the-creation-of-adam"]) console.log(id, JSON.stringify(out[id] ?? "none"));
