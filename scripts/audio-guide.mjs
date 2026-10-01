// The audio guide: a short spoken introduction to each room of the tours, and
// the passage leading on to the next, read by macOS's speech synthesiser and
// saved as AAC for the site to play when sound is on:
//   public/audio/<epoch>.m4a          the room's introduction
//   public/audio/bridge-<epoch>.m4a   on the way from that room to the next
//
// macOS only (uses `say` and `afconvert`). Node 23+ (imports the TypeScript data).
// Usage: node scripts/audio-guide.mjs [--voice Daniel] [epoch ...]
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { MOVEMENTS } from "../src/data/movements.ts";
import { WORLD_MOVEMENTS } from "../src/data/movements-world.ts";
import { GRAND_TOUR } from "../src/data/tour.ts";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "public/audio");
const args = process.argv.slice(2);
const voiceAt = args.indexOf("--voice");
const VOICE = voiceAt >= 0 ? args.splice(voiceAt, 2)[1] : "Daniel";
const only = new Set(args);

// Years as they are said: "40,000 BC", "1503".
const year = (y) => (y < 0 ? `${Math.abs(y).toLocaleString("en-US")} B.C.` : String(y));

function speak(text, file) {
  const aiff = path.join(os.tmpdir(), `pendant-${path.basename(file)}.aiff`);
  execFileSync("say", ["-v", VOICE, "-r", "172", "-o", aiff, text]);
  execFileSync("afconvert", ["-f", "m4af", "-d", "aac", "-b", "48000", "-c", "1", aiff, file]);
  fs.rmSync(aiff);
}

fs.mkdirSync(OUT, { recursive: true });
const byId = new Map([...MOVEMENTS, ...WORLD_MOVEMENTS].map((m) => [m.id, m]));
for (const room of GRAND_TOUR) {
  if (only.size && !only.has(room.movement)) continue;
  const m = byId.get(room.movement);
  if (!m) continue;
  const intro = [
    `${m.name}. ${m.region}, ${year(m.start)} to ${year(m.end)}.`,
    m.summary,
    `Look for these: ${m.hallmarks.map((h) => h.replace(/\.$/, "")).join(". ")}.`,
  ].join(" [[slnc 500]] ");
  speak(intro, path.join(OUT, `${m.id}.m4a`));
  if (room.bridge) speak(room.bridge, path.join(OUT, `bridge-${m.id}.m4a`));
  console.log(m.id);
}
