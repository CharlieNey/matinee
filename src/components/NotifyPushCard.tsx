"use client";

import { useSyncExternalStore } from "react";
import { Toggle } from "@/components/Toggle";
import { usePush } from "@/lib/usePush";
import { useApp } from "@/lib/store";

/* iOS Safari only delivers web push after Add to Home Screen; watching
 * display-mode clears the hint if the installed app is opened. */
function subscribeDisplayMode(onChange: () => void) {
  const media = window.matchMedia("(display-mode: standalone)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function readNeedsInstall(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !window.matchMedia("(display-mode: standalone)").matches
  );
}

const readServerNeedsInstall = () => false;

/**
 * Web-push opt-in for rush/lottery deadlines. Covers the shows the user
 * follows; hidden entirely when push isn't available or configured.
 */
export function NotifyPushCard() {
  const { follows } = useApp();
  // A paused follow remains in the user's list, but must not reach the push
  // subscription. This is the source of truth used by every re-sync.
  const slugs = follows
    .filter((follow) => follow.enabled)
    .map((follow) => follow.show.slug);
  const { status, subscribe, unsubscribe } = usePush(slugs);

  const needsInstall = useSyncExternalStore(
    subscribeDisplayMode,
    readNeedsInstall,
    readServerNeedsInstall,
  );

  if (status === "unavailable") return null;

  const caption =
    status === "denied"
      ? "Notifications are blocked for this site — allow them in your browser settings first."
      : needsInstall
        ? "On iPhone, add Matinee to your Home Screen to receive these."
        : status === "on"
          ? slugs.length > 0
            ? `Following ${slugs.length} show${slugs.length === 1 ? "" : "s"}.`
            : "Follow a show below and we'll ping you on its deadlines."
          : "We'll ping you when a lottery or rush for a show you follow opens or is about to close.";

  return (
    <div className="mt-3.5 rounded-card bg-paper p-5">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-title">Deadline pushes</h2>
          <p className="mt-1 text-body text-ink-soft">{caption}</p>
        </div>
        <Toggle
          on={status === "on"}
          onChange={(next) => {
            if (status === "loading" || status === "denied") return;
            if (next) subscribe();
            else unsubscribe();
          }}
          label="Rush and lottery deadline notifications"
        />
      </div>
    </div>
  );
}
