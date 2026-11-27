"use client";

import { useEffect } from "react";
import { analyticsEnabled, track } from "@/lib/analytics";

/**
 * Two page-wide signals, so individual links stay server components:
 *
 * - A tap on any link marked `data-seller-link="<surface>"` is a
 *   `seller_click`, with the show, platform and destination host.
 * - A landing with `?via=push` (added by public/sw.js on notification tap)
 *   is a `push_opened`. The flag is stripped either way, so it never ends
 *   up in a shared link.
 */
export function AnalyticsEvents() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("via") === "push") {
      track("push_opened", { path: url.pathname });
      url.searchParams.delete("via");
      window.history.replaceState(window.history.state, "", url.href);
    }

    if (!analyticsEnabled) return;
    const onClick = (event: MouseEvent) => {
      if (event.button > 1) return;
      const link = (event.target as Element | null)?.closest?.(
        "a[data-seller-link]",
      ) as HTMLAnchorElement | null;
      if (!link?.href) return;
      let host: string | null = null;
      try {
        host = new URL(link.href).hostname;
      } catch {}
      track("seller_click", {
        surface: link.dataset.sellerLink ?? null,
        show: link.dataset.show ?? null,
        platform: link.dataset.platform ?? null,
        host,
      });
    };
    document.addEventListener("click", onClick, { capture: true });
    document.addEventListener("auxclick", onClick, { capture: true });
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      document.removeEventListener("auxclick", onClick, { capture: true });
    };
  }, []);

  return null;
}
