"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-layout"],
  });
  return () => observer.disconnect();
}

const getMode = () =>
  document.documentElement.getAttribute("data-layout") === "web"
    ? ("web" as const)
    : ("mobile" as const);

/**
 * The live html[data-layout] mode (DESIGN.md §10), reactive to LayoutToggle
 * flips. Mode styling should stay pure CSS via the `web:`/`mobile:` variants;
 * reach for this only when *behavior* must branch — e.g. motion props, which
 * are inline styles the variants can't touch.
 */
export function useLayoutMode(): "mobile" | "web" {
  return useSyncExternalStore(subscribe, getMode, () => "mobile" as const);
}
