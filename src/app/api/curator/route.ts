import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { z } from "zod";
import { getArtist, getArtwork, getMovement, TRAITS } from "@/data";

const MODEL = "claude-sonnet-5-5";

// Cost guards. Notes about a work or an artist are the same for everyone, so
// they're written once per server and reused. Personal requests (taste read,
// "why this") are rate-limited per visitor.
const shared = new Map<string, string>();
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 20;
const hits = new Map<string, number[]>();

function allowed(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) return false;
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear(); // keep memory bounded
  return true;
}

const SYSTEM = `You are the curator of Pendant, an AI museum of taste. Visitors choose between pairs of artworks and you help them understand what they are drawn to.
Write for knowledgeable art lovers and art historians: precise, warm, plain prose with a light touch. Refer to specific works, artists and techniques by name.
Rules: no em dashes. No lists or headings, just prose. No flattery or filler ("What a wonderful choice"). Never invent facts, dates or provenance; if you are not sure of something, stay general. Keep to the requested length.`;

const Lean = z.object({ label: z.string().max(80), weight: z.number() });
const Profile = z.object({
  traits: z.array(Lean).max(12),
  epochs: z.array(Lean).max(8),
  artists: z.array(Lean).max(6),
  media: z.array(Lean).max(6),
  chosen: z.array(z.string().max(80)).max(12),
  passed: z.array(z.string().max(80)).max(12),
  saved: z.array(z.string().max(80)).max(12),
});

const Body = z.discriminatedUnion("task", [
  z.object({ task: z.literal("profile"), profile: Profile }),
  z.object({ task: z.literal("why"), artworkId: z.string().max(120), profile: Profile }),
  z.object({ task: z.literal("work"), artworkId: z.string().max(120) }),
  z.object({ task: z.literal("artist"), artistId: z.string().max(120) }),
]);

function describeWork(id: string) {
  const art = getArtwork(id);
  if (!art) return null;
  const artist = getArtist(art.artist);
  const movement = getMovement(art.movement);
  return [
    `"${art.title}" by ${artist?.name ?? "an unknown artist"}${artist?.lifespan ? ` (${artist.lifespan})` : ""}, ${art.year}.`,
    `${art.medium}${art.dimensions ? `, ${art.dimensions}` : ""}. ${art.collection}.`,
    movement ? `Filed under: ${movement.name}.` : "",
    art.culture ? `Culture: ${art.culture}.` : "",
    `Tagged: ${art.traits.map((t) => TRAITS[t]?.label ?? t).join(", ")}.`,
    art.blurb ? `Museum text: ${art.blurb}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function describeProfile(p: z.infer<typeof Profile>) {
  const fmt = (xs: { label: string; weight: number }[]) =>
    xs.map((x) => `${x.label} (${x.weight > 0 ? "+" : ""}${x.weight.toFixed(2)})`).join(", ") || "none yet";
  return [
    `Trait leanings (positive = drawn to): ${fmt(p.traits)}`,
    `Epoch leanings: ${fmt(p.epochs)}`,
    `Artists they keep choosing: ${fmt(p.artists)}`,
    `Media: ${fmt(p.media)}`,
    `Works they chose: ${p.chosen.join("; ") || "none"}`,
    `Works they passed over: ${p.passed.join("; ") || "none"}`,
    `Works they saved to their collection: ${p.saved.join("; ") || "none"}`,
  ].join("\n");
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "The curator needs an ANTHROPIC_API_KEY." }, { status: 503 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Bad request" }, { status: 400 });
  const body = parsed.data;

  const cacheKey = body.task === "work" ? `work:${body.artworkId}` : body.task === "artist" ? `artist:${body.artistId}` : null;
  const cached = cacheKey && shared.get(cacheKey);
  if (cached) return new Response(cached, { headers: { "Content-Type": "text/plain; charset=utf-8" } });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allowed(ip)) {
    return Response.json({ error: "The curator needs a short break. Try again in a few minutes." }, { status: 429 });
  }

  let prompt: string;
  // Headroom for the model's (low-effort) thinking plus the answer itself.
  let maxOutputTokens = 1200;

  if (body.task === "profile") {
    prompt = `Here is what the taste model has learned about this visitor.\n${describeProfile(body.profile)}\n\nWrite a curator's read of their taste in 3 to 4 sentences, addressed to them as "you". Connect the dots between specific works they chose and what those works share. End with one concrete suggestion of a painter, school or kind of work outside this collection they might explore next, and why.`;
  } else if (body.task === "why") {
    const work = describeWork(body.artworkId);
    if (!work) return Response.json({ error: "Unknown work" }, { status: 404 });
    prompt = `Visitor profile:\n${describeProfile(body.profile)}\n\nRecommended work:\n${work}\n\nIn 2 sentences, tell the visitor why this work suits them, pointing to something specific in it they should look for.`;
    maxOutputTokens = 800;
  } else if (body.task === "work") {
    const work = describeWork(body.artworkId);
    if (!work) return Response.json({ error: "Unknown work" }, { status: 404 });
    prompt = `${work}\n\nWrite a curator's note of about 110 words on this work: what it is, how it was made, why it matters, and one detail worth looking at closely. Only state facts you are confident of.`;
    maxOutputTokens = 1400;
  } else {
    const artist = getArtist(body.artistId);
    if (!artist) return Response.json({ error: "Unknown artist" }, { status: 404 });
    const movements = artist.movements.map((m) => getMovement(m)?.name).filter(Boolean).join(", ");
    prompt = artist.anonymous
      ? `The collection holds works attributed to "${artist.name}" (movements: ${movements}). In about 90 words, explain what we know about the makers of such works: workshops, training, patrons, and why their names were not recorded.`
      : `Artist: ${artist.name}${artist.lifespan ? `, ${artist.lifespan}` : ""}${artist.nationality ? `, ${artist.nationality}` : ""}. Movements in this collection: ${movements}.\n\nWrite a short biography of about 90 words for an art-literate reader: training, what distinguishes the work, and their place in art history. Only state facts you are confident of.`;
  }

  const result = streamText({
    model: anthropic(MODEL),
    system: SYSTEM,
    prompt,
    maxOutputTokens,
    providerOptions: { anthropic: { effort: "low" } },
  });

  // Pass the text through unchanged, keeping a copy of shareable notes.
  let text = "";
  const keep = new TransformStream<string, string>({
    transform(chunk, controller) {
      text += chunk;
      controller.enqueue(chunk);
    },
    flush() {
      if (cacheKey && text) shared.set(cacheKey, text);
    },
  });

  return new Response(result.textStream.pipeThrough(keep).pipeThrough(new TextEncoderStream()), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
