// Look up candidate must-include works by name; prints QID, sitelinks, image, description.
const UA = "AIArtMuseum/0.2 (https://github.com/cl-poehl/imaginary-museum)";
const names = process.argv.slice(2);
for (const n of names) {
  const s = await (await fetch(`https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&limit=3&search=${encodeURIComponent(n)}`, { headers: { "User-Agent": UA } })).json();
  const ids = s.search.map((x) => x.id).join("|");
  if (!ids) { console.log("NONE", n); continue; }
  const e = await (await fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=sitelinks|claims|descriptions|labels&languages=en&ids=${ids}`, { headers: { "User-Agent": UA } })).json();
  const best = Object.values(e.entities).map((x) => ({ id: x.id, label: x.labels?.en?.value, sl: Object.keys(x.sitelinks || {}).length, img: x.claims?.P18?.[0]?.mainsnak?.datavalue?.value, desc: x.descriptions?.en?.value })).sort((a, b) => b.sl - a.sl)[0];
  console.log(`${n} => ${best.id} | ${best.label} | sl ${best.sl} | ${best.img ? "img" : "NO-IMG"} | ${best.desc}`);
}
