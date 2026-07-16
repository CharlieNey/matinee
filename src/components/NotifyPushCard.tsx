"use client";

import { useEffect, useState } from "react";
import { Toggle } from "@/components/Toggle";
import { usePush } from "@/lib/usePush";
import { useApp } from "@/lib/store";

/**
 * Web-push opt-in for rush/lottery deadlines. Follows the shows the user has
 * Notify alerts for; hidden entirely when push isn't available or configured.
 */
export function NotifyPushCard() {
  const { alerts } = useApp();
  const slugs = alerts.map((a) => a.show.slug);
  const { status, subscribe, unsubscribe } = usePush(slugs);

  const [needsInstall, setNeedsInstall] = useState(false);
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    setNeedsInstall(isIOS && !isStandalone);
  }, []);

  if (status === "unavailable") return null;

  const caption =
    status === "denied"
      ? "Notifications are blocked for this site — allow them in your browser settings first."
      : needsInstall
        ? "On iPhone, add Theatr to your Home Screen to receive these."
        : status === "on"
          ? slugs.length > 0
            ? `Watching ${slugs.length} show${slugs.length === 1 ? "" : "s"} from your alerts.`
            : "Add a Notify alert below and we'll watch its deadlines too."
          : "We'll ping you when a lottery or rush for a show you watch opens or is about to close.";

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
