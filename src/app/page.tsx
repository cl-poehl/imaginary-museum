import { Tour } from "@/components/Tour";

/** A new seed per request. The page renders on every visit, and the seed is passed
 *  down as a prop, so server and browser build the identical tour. */
function freshSeed() {
  return Math.floor(Math.random() * 1e9);
}

/**
 * The museum itself: the entrance hall, with its exhibitions and the taste room
 * behind its doorways (?route= walks straight in). ?room= is a one-room tour of
 * an epoch. A fresh seed per visit, so the tests differ each time you walk a tour.
 */
export default async function Home(props: PageProps<"/">) {
  const { room } = await props.searchParams;
  const only = typeof room === "string" ? room : null;
  return (
    <main className="flex-1">
      <Tour only={only} seed={freshSeed()} />
    </main>
  );
}
