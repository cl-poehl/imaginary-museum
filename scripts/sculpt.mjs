// Cuts every sculpture and object out of the background of its photograph, for
// the 3D museum's niches. Writes:
//   public/sculpt/<id>.webp   the object, cut out (RGBA), cropped to it
//   src/data/sculpt.json      per work: aspect, and how much of the crop it fills
// Model: BiRefNet lite (background removal, MIT), run locally. Photos and the
// model are cached in scripts/.cache.
//
// Usage: node scripts/sculpt.mjs [id ...]
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { RawImage, env, pipeline } from "@huggingface/transformers";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const CACHE = path.join(ROOT, "scripts/.cache");
const OUT = path.join(ROOT, "public/sculpt");
const DATA = path.join(ROOT, "src/data");
const UA = "AIArtMuseum/0.1 (Pendant art museum data import; https://github.com/cl-poehl/imaginary-museum)";
const COLOR_MAX = 1024;

env.cacheDir = path.join(CACHE, "models");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const famous = JSON.parse(fs.readFileSync(path.join(DATA, "famous.json"), "utf8"));
const only = new Set(process.argv.slice(2));
const works = famous.artworks.filter((w) => (w.kind === "sculpture" || w.kind === "object") && (!only.size || only.has(w.id)));

async function photo(w) {
  const file = path.join(CACHE, "img/sculpt", `${w.id}.jpg`);
  if (fs.existsSync(file) && fs.statSync(file).size > 500) return file;
  for (let i = 0; i < 5; i++) {
    const r = await fetch(w.image.src, { headers: { "User-Agent": UA } }).catch(() => null);
    if (r?.ok) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
      return file;
    }
    await sleep(1000 * 2 ** i);
  }
  throw new Error(`Could not download ${w.image.src}`);
}

const cutout = await pipeline("background-removal", "onnx-community/BiRefNet_lite-ONNX", { dtype: "fp32" });

fs.mkdirSync(OUT, { recursive: true });
const existing = fs.existsSync(path.join(DATA, "sculpt.json")) ? JSON.parse(fs.readFileSync(path.join(DATA, "sculpt.json"), "utf8")) : {};
const result = { ...existing };

for (const w of works) {
  const file = await photo(w);
  // Work at a moderate size: plenty for a texture, quick for the model.
  const input = await sharp(file).rotate().resize({ width: 1280, height: 1280, fit: "inside" }).removeAlpha().png().toBuffer();
  const image = await RawImage.fromBlob(new Blob([input]));
  const { width: W, height: H } = image;

  const out = await cutout(image);
  const masked = Array.isArray(out) ? out[0] : out; // RGBA, alpha is the object

  const rgba = masked.data;
  const alpha = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) alpha[i] = rgba[i * 4 + 3];

  // The object's bounding box, with a little room.
  let x0 = W, y0 = H, x1 = 0, y1 = 0, area = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (alpha[y * W + x] > 128) {
        area++;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (area < W * H * 0.02) {
    // Nothing stands apart from its background: a relief filling its photograph, or a
    // scene (a pit of soldiers). Keep the whole picture.
    console.warn(`${w.id}: no single object, kept whole`);
    alpha.fill(255);
    for (let i = 0; i < W * H; i++) rgba[i * 4 + 3] = 255;
    x0 = 0;
    y0 = 0;
    x1 = W - 1;
    y1 = H - 1;
    area = W * H;
  }
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.02);
  x0 = Math.max(0, x0 - pad);
  y0 = Math.max(0, y0 - pad);
  x1 = Math.min(W - 1, x1 + pad);
  y1 = Math.min(H - 1, y1 + pad);
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;

  const colorCrop = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++)
    for (let x = 0; x < cw; x++) {
      const i = (y + y0) * W + (x + x0);
      const o = y * cw + x;
      const a = alpha[i];
      colorCrop[o * 4] = rgba[i * 4];
      colorCrop[o * 4 + 1] = rgba[i * 4 + 1];
      colorCrop[o * 4 + 2] = rgba[i * 4 + 2];
      colorCrop[o * 4 + 3] = a;
    }

  await sharp(colorCrop, { raw: { width: cw, height: ch, channels: 4 } })
    .resize({ width: COLOR_MAX, height: COLOR_MAX, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 84, alphaQuality: 90 })
    .toFile(path.join(OUT, `${w.id}.webp`));

  const fill = area / (cw * ch);
  result[w.id] = { aspect: +(cw / ch).toFixed(4), fill: +fill.toFixed(3) };
  console.log(`${w.id}: ${cw}×${ch}, fill ${fill.toFixed(2)}`);
}

fs.writeFileSync(path.join(DATA, "sculpt.json"), JSON.stringify(result, null, 1) + "\n");
console.log(`Done: ${Object.keys(result).length} works.`);
