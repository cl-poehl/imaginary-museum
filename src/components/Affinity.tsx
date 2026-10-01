"use client";

import Link from "next/link";
import { useStored } from "@/lib/store";
import { fit } from "@/lib/taste";

function describe(weight: number | undefined, seen: number) {
  if (!seen || weight === undefined) return { text: "Not in your picks yet", tone: "text-faint" };
  if (weight > 0.35) return { text: "Strong pull", tone: "text-accent" };
  if (weight > 0.1) return { text: "Leaning in", tone: "text-accent" };
  if (weight < -0.35) return { text: "Not for you, so far", tone: "text-muted" };
  if (weight < -0.1) return { text: "Leaning away", tone: "text-muted" };
  return { text: "Undecided", tone: "text-muted" };
}

/** How the visitor's taste model feels about an artist ("a:id") or epoch ("m:id"). */
export function Affinity({ feature }: { feature: string }) {
  const { model, ready } = useStored();
  if (!ready) return <Shell>…</Shell>;
  const { text, tone } = describe(model.weights.get(feature), model.counts.get(feature) ?? 0);
  return (
    <Shell>
      <span className={tone}>{text}</span>
    </Shell>
  );
}

/** Predicted fit for one artwork, once there is enough signal to say anything. */
export function FitBadge({ id }: { id: string }) {
  const { model, ready } = useStored();
  if (!ready) return <Shell>…</Shell>;
  if (model.decided < 5)
    return (
      <Shell>
        <Link href="/" className="text-faint hover:text-fg">
          Make a few picks to see your fit
        </Link>
      </Shell>
    );
  const value = fit(id, model);
  return (
    <Shell>
      <span className={value >= 60 ? "text-accent" : "text-muted"}>{value}% fit</span>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-xs">
      <span className="size-1.5 rounded-full bg-accent" />
      <span className="label text-faint">Your taste</span>
      {children}
    </span>
  );
}
