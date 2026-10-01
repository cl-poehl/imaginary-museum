"use client";

import { useEffect, useState } from "react";
import { getArtist, getArtwork } from "@/data";
import { displayImage } from "@/lib/images";

export function Lightbox({ id, onClose }: { id: string; onClose: () => void }) {
  const art = getArtwork(id)!;
  const artist = getArtist(art.artist)!;
  // Try a large rendition first; fall back if the source doesn't offer one.
  const [image, setImage] = useState(() => displayImage(art.image, "100vw"));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={art.title}
      onClick={onClose}
      className="rise fixed inset-0 z-50 flex cursor-zoom-out flex-col items-center justify-center gap-4 bg-black/95 p-4 backdrop-blur-sm sm:p-10"
    >
      <img
        src={image.src}
        srcSet={image.srcSet}
        sizes={image.sizes}
        onError={() => image.src !== image.fallback && setImage({ src: image.fallback, fallback: image.fallback })}
        alt={`${art.title}, ${artist.name}`}
        className="h-auto max-h-[85vh] w-auto max-w-full object-contain shadow-2xl"
      />
      <p className="text-center text-sm text-muted">
        <span className="font-serif text-[15px] text-fg italic">{art.title}</span> · {artist.name}, {art.year}
        <span className="label ml-3 text-faint">Esc to close</span>
      </p>
    </div>
  );
}
