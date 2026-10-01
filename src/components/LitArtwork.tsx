"use client";

import { useEffect, useMemo, useState } from "react";
import { thumb, type Artwork } from "@/data";
import { displayImage } from "@/lib/images";

/**
 * An artwork hung on a gallery wall under a soft pool of light.
 * The small thumbnail shows at once; the sharp version swaps in when it's ready.
 */
export function LitArtwork({
  art,
  alt,
  sizes = "(min-width: 768px) 50vw, 100vw",
  light = 1,
  className = "",
}: {
  art: Artwork;
  alt: string;
  sizes?: string;
  /** Strength of the light on the wall, 0–1.5. */
  light?: number;
  className?: string;
}) {
  const small = thumb(art.image);
  const full = useMemo(() => displayImage(art.image, sizes), [art.image, sizes]);
  const [sharp, setSharp] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    if (full.sizes) img.sizes = full.sizes;
    if (full.srcSet) img.srcset = full.srcSet;
    img.src = full.src;
    img.onload = () => setSharp(true);
    return () => {
      img.onload = null;
    };
  }, [full]);

  return (
    <div className={`relative flex h-full w-full items-center justify-center ${className}`}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-1000"
        style={{
          opacity: loaded ? light : 0,
          background: "radial-gradient(ellipse 55% 60% at 50% 45%, rgb(255 246 228 / 0.07), transparent 70%)",
        }}
      />
      <img
        src={sharp ? full.src : small}
        srcSet={sharp ? full.srcSet : undefined}
        sizes={sharp ? full.sizes : undefined}
        alt={alt}
        width={art.image.width}
        height={art.image.height}
        decoding="async"
        ref={(el) => {
          if (el?.complete && el.naturalWidth > 0 && !loaded) setLoaded(true);
        }}
        onLoad={() => setLoaded(true)}
        className={`relative h-auto max-h-full w-auto max-w-full object-contain shadow-[0_2px_4px_rgb(0_0_0/0.35),0_24px_60px_-20px_rgb(0_0_0/0.75)] transition-[opacity,filter] duration-700 ${
          loaded ? "opacity-100 blur-0" : "opacity-0 blur-sm"
        }`}
      />
    </div>
  );
}
