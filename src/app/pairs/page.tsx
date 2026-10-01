import type { Metadata } from "next";
import { Duel } from "@/components/Duel";

export const metadata: Metadata = {
  title: "Pairs",
  description: "Two works at a time: choose the one you would rather live with, and the museum learns your taste.",
};

export default function PairsPage() {
  return (
    <main className="flex flex-1 flex-col">
      <Duel />
    </main>
  );
}
