import type { NextConfig } from "next";

/**
 * Baseline security headers (open-source hygiene). No CSP yet: the layout-mode
 * script is inline, Next injects inline chunks, and share images use blob:
 * URLs — a real CSP needs nonces wired through; tracked as a follow-up.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    viewTransition: true,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  /** Phase 14 — the marketplace-era routes; no shared link should 404. */
  async redirects() {
    return [
      { source: "/discover", destination: "/", permanent: true },
      { source: "/listings", destination: "/profile", permanent: true },
      { source: "/tickets", destination: "/", permanent: true },
      { source: "/tickets/:id", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
