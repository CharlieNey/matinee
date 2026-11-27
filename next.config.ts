import type { NextConfig } from "next";

// A static CSP preserves CDN-cached pages. Next's framework/bootstrap styles
// and the pre-paint layout script require inline allowances; all external
// origins, frames, plugins, and cross-origin connections remain denied
// (one exception, PostHog when analytics is enabled, is below).
const isDevelopment = process.env.NODE_ENV === "development";
const isVercel = process.env.VERCEL === "1";
// Usage analytics is off unless a PostHog key is set at build time
// (src/lib/analytics.ts). Only then may the page talk to PostHog's API host;
// the SDK is bundled and loads no remote scripts, so script-src is unchanged.
const analyticsOrigin = process.env.NEXT_PUBLIC_POSTHOG_KEY
  ? new URL(process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com")
      .origin
  : null;
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${analyticsOrigin ? ` ${analyticsOrigin}` : ""}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // Only on Vercel, where every request is HTTPS. On a local `next start`
  // over http://127.0.0.1, WebKit upgrades script URLs to https and the app
  // never hydrates (Chromium exempts loopback).
  ...(isVercel ? ["upgrade-insecure-requests"] : []),
].join("; ");

/** Baseline response hardening for every page and route. */
const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75, 85],
  },
  experimental: {
    sri: { algorithm: "sha256" },
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
