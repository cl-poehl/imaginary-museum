// Hosts every artwork image on the site itself, so visitors' browsers don't
// fetch them from Wikimedia (faster, and nothing about visitors goes to a third
// party). For each work, three sizes in WebP, fitted inside a square box:
//   public/art/<id>-400.webp    thumbnails
//   public/art/<id>-960.webp    most views, and the 3D museum
//   public/art/<id>-1600.webp   full-screen views and the largest works
// and src/data/hosted.json lists the works that have them (with the 1600's size).
// Wikimedia serves only standard thumbnail widths, so we fetch its 1920px one
// (or the 1280px one we already link to) and resize it here.
//
// Usage: node scripts/host-images.mjs [id ...]
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const CACHE = path.join(ROOT, "scripts/.cache/img/host");
const OUT = path.join(ROOT, "public/art");
const DATA = path.join(ROOT, "src/data");
const UA = "AIArtMuseum/0.1 (Pendant art museum data import; https://github.com/cl-poehl/imaginary-museum)";
const SIZES = [
  { box: 400, quality: 76 },
  { box: 960, quality: 76 },
  { box: 1600, quality: 70 },
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const curated = JSON.parse(fs.readFileSync(path.join(DATA, "images.json"), "utf8"));
const famous = JSON.parse(fs.readFileSync(path.join(DATA, "famous.json"), "utf8"));
const only = new Set(process.argv.slice(2));
const works = [...Object.entries(curated).map(([id, image]) => ({ id, image })), ...famous.artworks.map((w) => ({ id: w.id, image: w.image }))].filter(
  (w) => !only.size || only.has(w.id),
);

async function download(w) {
  const file = path.join(CACHE, `${w.id}.img`);
  if (fs.existsSync(file) && fs.statSync(file).size > 1000) return file;
  const tries = [w.image.src.includes("/1280px-") ? w.image.src.replace("/1280px-", "/1920px-") : null, w.image.src].filter(Boolean);
  for (const url of tries)
    for (let i = 0; i < 4; i++) {
      const r = await fetch(url, { headers: { "User-Agent": UA } }).catch(() => null);
      if (r?.ok && (r.headers.get("content-type") ?? "").startsWith("image/")) {
        fs.mkdirSync(CACHE, { recursive: true });
        fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
        return file;
      }
      if (r && r.status < 500 && r.status !== 429) break; // this size doesn't exist; try the next
      await sleep(1500 * 2 ** i);
    }
  throw new Error(`Could not download ${w.image.src}`);
}

fs.mkdirSync(OUT, { recursive: true });
const hostedPath = path.join(DATA, "hosted.json");
const hosted = fs.existsSync(hostedPath) ? JSON.parse(fs.readFileSync(hostedPath, "utf8")) : {};
let done = 0;
for (const w of works) {
  try {
    const file = await download(w);
    let size = null;
    for (const s of SIZES) {
      const info = await sharp(file)
        .rotate()
        .resize({ width: s.box, height: s.box, fit: "inside", withoutEnlargement: true })
        .webp({ quality: s.quality })
        .toFile(path.join(OUT, `${w.id}-${s.box}.webp`));
      if (s.box === 1600) size = [info.width, info.height];
    }
    hosted[w.id] = size;
    done++;
    if (done % 25 === 0) console.log(`${done}/${works.length}`);
    await sleep(300);
  } catch (e) {
    console.warn(`${w.id}: ${e.message}`);
  }
}
fs.writeFileSync(hostedPath, JSON.stringify(hosted) + "\n");
console.log(`Done: ${Object.keys(hosted).length} works hosted.`);
