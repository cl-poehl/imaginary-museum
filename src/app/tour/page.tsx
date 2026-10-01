import type { Metadata } from "next";
import { Tour } from "@/components/Tour";

export const metadata: Metadata = {
  title: "Guided tours",
  description: "Guided walks through three exhibitions: Ancient Worlds, The Old Masters and The Modern Eye.",
};

/** A new seed per request. The page renders on every visit, and the seed is passed
 *  down as a prop, so server and browser build the identical tour. */
function freshSeed() {
  return Math.floor(Math.random() * 1e9);
}

export default async function TourPage(props: PageProps<"/tour">) {
  const { room } = await props.searchParams;
  const only = typeof room === "string" ? room : null;
  // One building for every route: the entrance hall, or (with ?route=) straight into an
  // exhibition. A fresh seed per visit, so the tests differ each time you walk a tour.
  return (
    <main className="flex-1">
      <Tour only={only} seed={freshSeed()} />
    </main>
  );
}
