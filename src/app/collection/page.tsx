import type { Metadata } from "next";
import { SavedCollection } from "@/components/SavedCollection";

export const metadata: Metadata = { title: "Your collection" };

export default function CollectionPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 sm:px-8">
      <SavedCollection />
    </main>
  );
}
