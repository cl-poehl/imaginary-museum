# The Imaginary Museum

A museum you walk through in 3D, and that learns your taste.

**Visit it: [imaginary-museum.vercel.app](https://imaginary-museum.vercel.app)**

The name is André Malraux's *musée imaginaire* (1947): the museum without walls that reproductions made possible, which each of us assembles for ourselves.

- `/` the museum. From the entrance hall, three exhibitions run one after another through history (Ancient Worlds, The Old Masters, The Modern Eye), with a taste room through the right-hand wall and your own room through the left. Keys: → or space walk on, ← back, Z closer, M map, S sound, F full screen, Esc back to the entrance hall. Drag to look around, scroll or pinch to look closer, click any work to go to it. Links follow you: `/?route=old-masters&at=mona-lisa` opens at that work.
- `/pairs` the same choosing as the taste room, on a page: ← → choose, ↑ both, ↓ neither, space skip, U undo
- `/works/[id]`, `/artists/[id]`, `/epochs/[id]` detail pages; `/epochs` timeline; `/artists` index
- `/taste` your profile and predicted matches; `/collection` saved works and where to see them; `/shared?p=…` a shareable profile; `/privacy`

## How it works

- **Collection** (`src/data`): 374 of the world's most famous public-domain artworks across 35 epochs, from Ice Age figurines to early abstraction. "Famous" is measured by how many Wikipedia language editions have an article about the work. The original 54 are hand-written (`artworks.ts`); the other 320 are in `famous.json`, each researched from its Wikipedia article and Wikidata before its label was written. Images come from Wikimedia Commons (public domain only; artists who died after 1955 are excluded) and are served by the site itself (`public/art`); only the full-resolution image for looking closely is fetched from Wikimedia.
- **The museum** (`src/components/World3D.tsx`): one three.js scene (React Three Fiber) holding the entrance hall (`Lobby3D`), each exhibition's hall (`Museum3D`, laid out by `src/lib/museum-layout.ts` at roughly real sizes, `src/lib/display.ts`), the taste room (`TasteRoom3D`) and your own room. Tours are built in `src/lib/tour.ts` from `src/data/tour.ts`; your own room in `src/lib/personal-tour.ts`. Phones get a lighter version (`src/lib/quality.ts`).
- **Taste model** (`src/lib/taste.ts`): Bradley–Terry over sparse features (traits, epoch, artist, century, medium) plus 16 PCA components of each work's CLIP image embedding. "Both", "neither" and saved works add absolute signals. Your own room opens after 8 choices: the works the model rates highest, each labelled with the liked work it most resembles.
- **Visual similarity** (`src/lib/similar.ts`): cosine over 512-d CLIP embeddings, server-only.
- **Sound** (`src/lib/sound.ts`): a generated room tone, and an audio guide per room (`public/audio`).
- **State** (`src/lib/store.ts`): localStorage via `useSyncExternalStore`; nothing about visitors is sent to the server. Shared profiles are encoded in the URL.
- **Security**: a strict Content Security Policy and other headers in `next.config.ts`. No API routes, no secrets.

## Data pipeline (`scripts/famous`)

1. `01-rank.mjs` ranks artworks on Wikidata by number of Wikipedia languages.
2. `02-select.mjs` picks the collection: public domain only, no monuments or photographs, max 8 works per artist, plus hand-picked world masterpieces.
3. `03-research.mjs` saves each work's Wikipedia article, Wikidata facts and a verified image to `scripts/.cache/famous/research`.
4. Labels and bios are written from that research following `WRITING_GUIDE.md`.
5. `04-assemble.mjs` validates everything and writes `src/data/famous.json`.
6. `node scripts/embed-images.mjs` computes CLIP embeddings for every work.

Then, for the museum:

- `node scripts/host-images.mjs [id …]` downloads each work's image and writes the hosted copies (400, 960 and 1600px WebP) and `src/data/hosted.json`.
- `node scripts/sculpt.mjs [id …]` cuts sculptures and objects out of their photographs for their cases.
- `node scripts/audio-guide.mjs [--voice Daniel] [epoch …]` speaks the audio guide (macOS: `say` and `afconvert`).
- `node scripts/credits.mjs` writes `CREDITS.md`, each image's source, author and licence.

`scripts/resolve-images.mjs` resolves images for the original 54. `scripts/archive/` holds the earlier Met/AIC importer.

## Develop

```bash
npm run dev
```

Pushing to `main` deploys to Vercel.

## Licence and credits

The code is MIT licensed (`LICENSE`). The images are from Wikimedia Commons and keep their own licences: most are
public domain, and the photographers of the rest are credited in [`CREDITS.md`](CREDITS.md) (regenerate it with
`node scripts/credits.mjs`). The wall texts draw on Wikipedia (CC BY-SA 4.0) and Wikidata (CC0). The audio guide is
spoken by macOS's speech synthesiser.
