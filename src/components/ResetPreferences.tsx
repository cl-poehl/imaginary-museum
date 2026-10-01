"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearStored } from "@/lib/store";

/** Clears everything this browser has stored: picks, saved works, settings, curator notes. */
export function ResetPreferences() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    clearStored();
    // Mark as done after the store has notified its listeners.
    const t = window.setTimeout(() => setDone(true), 0);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <>
      <p className="label text-faint">{done ? "Done" : "Clearing"}</p>
      <h1 className="font-serif text-[28px] italic">A fresh start.</h1>
      <p className="text-muted">Your picks, saved works and settings in this browser have been cleared.</p>
      <Link href="/" className="label mt-4 text-muted transition-colors hover:text-fg">
        Back to the galleries
      </Link>
    </>
  );
}
