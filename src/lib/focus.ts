import focusData from "@/data/focus.json";

export type Focus = { x: number; y: number; h: number };
const FOCUS = focusData as Record<string, Focus>;

/** Where a close-up begins: the main face if one was detected, else the upper centre. */
export function focusFor(id: string): Focus {
  return FOCUS[id] ?? { x: 0.5, y: 0.35, h: 0 };
}
