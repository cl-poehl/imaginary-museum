"use client";

import { useState, type ImgHTMLAttributes } from "react";

/** An <img> that fades in once decoded. Remount (via key) to reset. */
export function FadeImage({ className = "", onError, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      {...props}
      alt={props.alt ?? ""}
      decoding="async"
      ref={(el) => {
        if (el?.complete && el.naturalWidth > 0 && !loaded) setLoaded(true);
      }}
      onLoad={() => setLoaded(true)}
      onError={onError}
      className={`${className} transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
    />
  );
}
