import type { Metadata } from "next";
import { ResetPreferences } from "@/components/ResetPreferences";

export const metadata: Metadata = { title: "Reset" };

export default function ResetPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-32 text-center">
      <ResetPreferences />
    </main>
  );
}
