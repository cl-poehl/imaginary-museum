import type { NextConfig } from "next";

// What the pages may load, and from where. Everything is served by the site itself,
// except the full-resolution images for looking closely, which come from Wikimedia.
// Next.js's own inline scripts need 'unsafe-inline'; in development, React and the
// live reload also need eval and a websocket.
const dev = process.env.NODE_ENV !== "production";
const WIKIMEDIA = "https://upload.wikimedia.org https://thumb.wikimedia.org";
const csp = [
  "default-src 'self'",
  `img-src 'self' data: blob: ${WIKIMEDIA}`,
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  `connect-src 'self' ${WIKIMEDIA}${dev ? " ws:" : ""}`,
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
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
