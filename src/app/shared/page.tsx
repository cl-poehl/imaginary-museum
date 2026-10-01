import type { Metadata } from "next";
import { Suspense } from "react";
import { SharedProfile } from "@/components/SharedProfile";

export const metadata: Metadata = { title: "A shared taste" };

export default function SharedPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 sm:px-8">
      <Suspense fallback={<div className="h-96" />}>
        <SharedProfile />
      </Suspense>
    </main>
  );
}
