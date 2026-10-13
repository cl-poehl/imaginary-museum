// Writes CREDITS.md: the source, author and licence of every image the site
// hosts (public/art, and the cut-outs in public/sculpt), looked up on Wikimedia
// Commons. Images under a Creative Commons licence that requires credit are
// listed in full; public-domain and CC0 ones are listed by name.
//
// Usage: node scripts/credits.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DATA = path.join(ROOT, "src/data");
const UA = "AIArtMuseum/0.2 (https://github.com/cl-poehl/imaginary-museum)";

const curated = JSON.parse(fs.readFileSync(path.join(DATA, "images.json"), "utf8"));
const famous = JSON.parse(fs.readFileSync(path.join(DATA, "famous.json"), "utf8"));
const titles = new Map(famous.artworks.map((w) => [w.id, w.title]));
// The original 54 keep their titles in artworks.ts; their ids read well enough.
const titleOf = (id) => titles.get(id) ?? id.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
const works = [
  ...Object.entries(curated).map(([id, image]) => ({ id, source: image.source })),
  ...famous.artworks.map((w) => ({ id: w.id, source: w.image.source })),
];
const cutOut = new Set(fs.readdirSync(path.join(ROOT, "public/sculpt")).map((f) => f.replace(/\.webp$/, "")));

const fileTitle = (url) => "File:" + decodeURIComponent(url.split("/wiki/File:")[1] ?? "").replace(/_/g, " ");
const plain = (html = "") =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

// The first sentence or so: some author fields carry long notes on retouching.
const short = (s) => {
  const first = s.split(/(?<=\.)\s|\s(?=This is a)/)[0];
  return first.length > 90 ? `${first.slice(0, 87).trimEnd()}…` : first;
};

const meta = new Map();
const all = works.map((w) => fileTitle(w.source));
for (let i = 0; i < all.length; i += 50) {
  const q = new URLSearchParams({
    action: "query",
    format: "json",
    prop: "imageinfo",
    iiprop: "extmetadata|user",
    iiextmetadatafilter: "LicenseShortName|LicenseUrl|Artist|Attribution|Credit",
    titles: all.slice(i, i + 50).join("|"),
  });
  const r = await (await fetch(`https://commons.wikimedia.org/w/api.php?${q}`, { headers: { "User-Agent": UA } })).json();
  const from = new Map((r.query.normalized ?? []).map((n) => [n.to, n.from]));
  for (const p of Object.values(r.query.pages)) {
    const m = p.imageinfo?.[0]?.extmetadata ?? {};
    const uploader = p.imageinfo?.[0]?.user;
    meta.set(from.get(p.title) ?? p.title, {
      licence: plain(m.LicenseShortName?.value) || "unknown",
      url: plain(m.LicenseUrl?.value),
      // Who to credit, as the file's page gives it: its attribution line, else its author.
      // "Own work" means the uploader took it.
      author: (() => {
        const named = short(plain(m.Attribution?.value) || plain(m.Artist?.value) || plain(m.Credit?.value));
        return named && !/^own work\.?$/i.test(named) ? named : uploader ? `${uploader} (Wikimedia Commons)` : "see its Commons page";
      })(),
    });
  }
}

const free = (l) => /public domain|^pd|cc0/i.test(l);
const rows = works.map((w) => ({ ...w, title: titleOf(w.id), ...(meta.get(fileTitle(w.source)) ?? { licence: "unknown", url: "", author: "unknown" }) }));
const credited = rows.filter((r) => !free(r.licence)).sort((a, b) => a.title.localeCompare(b.title));
const others = rows.filter((r) => free(r.licence)).sort((a, b) => a.title.localeCompare(b.title));
const cell = (s) => s.replace(/\|/g, "\\|");
const changes = (r) => (cutOut.has(r.id) ? "resized, WebP; background removed for its case" : "resized, WebP");

const md = `# Image credits

Every picture in the museum comes from [Wikimedia Commons](https://commons.wikimedia.org). The site serves resized
copies of them (\`public/art\`, 400, 960 and 1600 px WebP), and for sculptures and objects a version with the
background removed (\`public/sculpt\`). The originals' licences apply to these copies; the licences below are as
recorded on Commons when this file was generated (\`node scripts/credits.mjs\`).

## Under licences that require credit (${credited.length})

| Work | Credit (as on Commons) | Licence | Changes |
| --- | --- | --- | --- |
${credited.map((r) => `| [${cell(r.title)}](${r.source}) | ${cell(r.author)} | ${r.url ? `[${r.licence}](${r.url})` : r.licence} | ${changes(r)} |`).join("\n")}

Images under a ShareAlike (BY-SA) licence, and the changed copies of them here, may be reused under the same licence.

## Public domain or CC0 (${others.length})

${others.map((r) => `[${r.title}](${r.source})`).join(" · ")}
`;
fs.writeFileSync(path.join(ROOT, "CREDITS.md"), md);
console.log(`CREDITS.md: ${credited.length} credited, ${others.length} public domain or CC0.`);
