import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Museum originals can be 4000px+; the optimizer resizes them on the way out.
    remotePatterns: [new URL("https://images.metmuseum.org/**"), new URL("https://www.artic.edu/iiif/**")],
    qualities: [75],
  },
};

export default nextConfig;
