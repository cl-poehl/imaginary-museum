// Resolves the Commons filenames in candidates.json to 1280px thumbnail URLs
// and writes them to src/data/images.json. Misses are printed with search
// suggestions so you can fix the filename and rerun.
// Usage: node scripts/resolve-images.mjs
import fs from "node:fs";

const UA = "AIArtMuseum/0.1 (https://github.com/cl-poehl/imaginary-museum)";
const cands = JSON.parse(fs.readFileSync(new URL("./candidates.json", import.meta.url)));
const api = "https://commons.wikimedia.org/w/api.php";

async function q(params) {
  const url = api + "?" + new URLSearchParams({ format: "json", formatversion: "2", origin: "*", ...params });
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  return r.json();
}

async function info(title) {
  const d = await q({ action: "query", titles: "File:" + title, prop: "imageinfo", iiprop: "url|size", iiurlwidth: "1280", redirects: "1" });
  const p = d.query.pages[0];
  if (p.missing || !p.imageinfo) return null;
  const ii = p.imageinfo[0];
  return { file: p.title.replace(/^File:/, ""), src: ii.thumburl || ii.url, width: ii.thumbwidth || ii.width, height: ii.thumbheight || ii.height, page: ii.descriptionurl };
}

async function search(term) {
  const d = await q({ action: "query", list: "search", srsearch: term + " filetype:bitmap", srnamespace: "6", srlimit: "5" });
  return d.query.search.map((s) => s.title.replace(/^File:/, ""));
}

const out = {};
const misses = {};
for (const [id, [file, term]] of Object.entries(cands)) {
  const r = await info(file);
  if (r) out[id] = r;
  else misses[id] = await search(term);
}
const images = Object.fromEntries(
  Object.entries(out).map(([id, v]) => [id, { src: v.src.split("?")[0], width: v.width, height: v.height, source: v.page }]),
);
fs.writeFileSync(new URL("../src/data/images.json", import.meta.url), JSON.stringify(images, null, 1) + "\n");
console.log(`${Object.keys(images).length} resolved`);
if (Object.keys(misses).length) console.log("Missing:", JSON.stringify(misses, null, 1));
