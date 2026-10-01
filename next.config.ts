import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Museum originals can be 4000px+; the optimizer resizes them on the way out.
    remotePatterns: [new URL("https://images.metmuseum.org/**"), new URL("https://www.artic.edu/iiif/**")],
    qualities: [75],
  },
  // The museum used to live at /tour; it is now the home page. Old links (and their
  // ?route= or ?room=) still arrive.
  async redirects() {
    return [{ source: "/tour", destination: "/", permanent: true }];
  },
};

export default nextConfig;
