import { getImageProps } from "next/image";
import { thumb, type ArtImage } from "@/data";

export type DisplayImage = { src: string; srcSet?: string; sizes?: string; fallback: string };

const isWikimedia = (src: string) => /(^|\.)wikimedia\.org\//.test(new URL(src).host + "/");

/**
 * Props for showing an artwork large. Wikimedia serves pre-sized renditions we
 * ask for directly; other museum originals (often 4000px+) go through the
 * optimizer. Any failure falls back to the plain URL rather than breaking the page.
 */
export function displayImage(image: ArtImage, sizes: string): DisplayImage {
  if (isWikimedia(image.src)) return { src: thumb(image, 1920), fallback: image.src };
  try {
    const { props } = getImageProps({ src: image.src, width: image.width, height: image.height, alt: "", sizes, quality: 75 });
    return { src: props.src, srcSet: props.srcSet, sizes: props.sizes, fallback: image.thumb ?? image.src };
  } catch {
    return { src: image.src, fallback: image.thumb ?? image.src };
  }
}
