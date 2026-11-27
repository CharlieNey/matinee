/**
 * Usage analytics, off by default. Nothing loads and nothing is sent unless
 * NEXT_PUBLIC_POSTHOG_KEY is set at build time. When it is, PostHog runs in
 * its documented cookieless mode (`cookieless_mode: "always"`): no cookies,
 * no local or session storage, no person profiles, no session recording, no
 * autocapture, no pageviews and no remote scripts. Only the named events
 * below are captured.
 *
 * PostHog's project setting "Enable cookieless tracking" must be on, or
 * PostHog discards these events (docs/GO-LIVE.md).
 */

import type { PostHog } from "posthog-js";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "";
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

export const analyticsEnabled = KEY !== "";

export type AnalyticsEvent =
  /** A tap through to an official seller or entry page. */
  | "seller_click"
  | "show_followed"
  /** The browser granted notifications and the subscription was saved. */
  | "push_opt_in"
  /** A notification was tapped (the service worker adds ?via=push). */
  | "push_opened"
  /** Server-side, once per delivered notification. */
  | "push_sent";

type Properties = Record<string, string | number | boolean | null>;

let client: Promise<PostHog | null> | null = null;

function load(): Promise<PostHog | null> {
  if (!analyticsEnabled || typeof window === "undefined") {
    return Promise.resolve(null);
  }
  client ??= import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(KEY, {
        api_host: HOST,
        defaults: "2026-08-30",
        cookieless_mode: "always",
        person_profiles: "never",
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        rageclick: false,
        capture_dead_clicks: false,
        capture_heatmaps: false,
        capture_performance: false,
        capture_exceptions: false,
        disable_session_recording: true,
        disable_surveys: true,
        disable_product_tours: true,
        disable_conversations: true,
        disable_web_experiments: true,
        advanced_disable_flags: true,
        disable_external_dependency_loading: true,
      });
      return posthog;
    })
    .catch(() => null);
  return client;
}

/** Fire and forget; never throws, never blocks the UI. */
export function track(event: AnalyticsEvent, properties: Properties = {}) {
  if (!analyticsEnabled) return;
  void load().then((posthog) => posthog?.capture(event, properties));
}
