"use client";

import { useStored } from "@/lib/store";

export function TasteCount() {
  const { model, ready } = useStored();
  if (!ready || model.decided === 0) return null;
  return <span className="font-mono text-[10px] tracking-normal text-accent tabular-nums">{model.decided}</span>;
}
