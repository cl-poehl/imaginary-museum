// The exhibitions in the tours' entrance hall, with what the hall shows
// of each: its lettering, the first work you'll meet, and a few highlights.

import { getArtwork, getMovement } from "@/data";
import { ROUTES } from "@/data/tour";
import { buildTour } from "@/lib/tour";

export type Exhibition = {
  id: string;
  name: string;
  span: string;
  description: string;
  stats: string;
  firstWork?: string;
  firstRoom: string;
  showcase: string[];
};

/** The exhibitions, with their highlights shared out so none appears twice. */
export function exhibitions(): Exhibition[] {
  const used = new Set<string>();
  return ROUTES.map((r) => {
    const tour = buildTour({ route: r.id });
    const first = tour.steps.find((s) => s.kind === "work");
    const minutes = Math.round((tour.steps.length * 12) / 60);
    const firstWork = first?.kind === "work" ? first.id : undefined;
    // Three highlights per exhibition, none shared, and not the work already
    // visible through the doorway.
    const picks = r.showcase.filter((id) => getArtwork(id) && !used.has(id) && id !== firstWork).slice(0, 3);
    picks.forEach((id) => used.add(id));
    return {
      id: r.id,
      name: r.name,
      span: r.span,
      description: r.description,
      stats: `${r.rooms.length} rooms · about ${minutes} minutes · begins with ${getMovement(r.rooms[0])?.name}`,
      firstWork,
      firstRoom: r.rooms[0],
      showcase: picks,
    };
  });
}

