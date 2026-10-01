import type { Metadata } from "next";
import { TasteProfile } from "@/components/TasteProfile";

export const metadata: Metadata = { title: "Your taste" };

export default function TastePage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 sm:px-6">
      <TasteProfile />
    </main>
  );
}
