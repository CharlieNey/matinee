"use client";

import { useSyncExternalStore } from "react";
import { BellOff, Send } from "lucide-react";
import { Toggle } from "@/components/Toggle";
import { useToast } from "@/components/Toast";
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
 * follows and always explains its state, including unsupported previews.
 */
export function NotifyPushCard() {
  const { follows } = useApp();
  const toast = useToast();
  // A paused follow remains in the user's list, but must not reach the push
  // subscription. This is the source of truth used by every re-sync.
  const slugs = follows
    .filter((follow) => follow.enabled)
    .map((follow) => follow.show.slug);
  const { status, reason, subscribe, unsubscribe, sendTest } = usePush(slugs);

  const needsInstall = useSyncExternalStore(
    subscribeDisplayMode,
    readNeedsInstall,
    readServerNeedsInstall,
  );

  const caption =
    needsInstall
      ? "On iPhone, add Matinee to your Home Screen first. Apple only allows web push from installed apps."
      : status === "unavailable"
        ? reason === "not-configured"
          ? "Deadline alerts aren’t connected in this preview. You can still follow shows and use their live schedules below."
          : reason === "registration-failed"
            ? "This browser supports notifications, but Matinee couldn’t start its notification service. Reload or try another browser."
            : "This browser can’t receive web push. You can still follow shows and check every deadline in Matinee."
        : status === "error"
          ? reason === "backend-unavailable"
            ? "Your browser is ready, but Matinee couldn’t save the subscription. Try connecting again."
            : "Matinee couldn’t finish turning alerts on. Check the browser permission and try again."
          : status === "denied"
      ? "Notifications are blocked for this site — allow them in your browser settings first."
            : status === "on"
              ? slugs.length > 0
                ? `Ready for ${slugs.length} followed show${slugs.length === 1 ? "" : "s"}. We’ll alert you when a window opens or is about to close.`
                : "Alerts are on. Follow a show below and we’ll add its deadlines."
              : "Turn this on once and Matinee will watch the odd-hour lottery and rush deadlines for you.";

  const unavailable = status === "unavailable" || status === "error";

  return (
    <div className="mt-3.5 rounded-card bg-paper p-5">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-title">Deadline alerts</h2>
            {unavailable && (
              <span className="inline-flex items-center gap-1 rounded-full bg-inset px-2 py-1 text-label font-semibold text-ink-soft">
                <BellOff className="size-3" strokeWidth={2} aria-hidden="true" />
                {status === "error" ? "Needs attention" : "Unavailable here"}
              </span>
            )}
          </div>
          <p className="mt-1 text-body text-ink-soft">{caption}</p>
        </div>
        {!unavailable && !needsInstall && (
          <Toggle
            on={status === "on"}
            onChange={(next) => {
              if (status === "loading" || status === "denied") return;
              if (next) subscribe();
              else unsubscribe();
            }}
            label="Rush and lottery deadline notifications"
          />
        )}
      </div>
      <div className="mt-4 border-t border-line pt-3.5">
        <p className="text-caption text-ink-soft">
          <b className="font-semibold text-ink">Lottery → rush → TKTS.</b>{" "}
          Alerts cover the first two; the live board is always waiting as your fallback.
        </p>
        {status === "error" && !needsInstall && (
          <button
            type="button"
            onClick={subscribe}
            className="mt-3 h-10 rounded-full bg-espresso px-4 text-caption font-semibold text-white transition-transform active:scale-[0.97]"
          >
            Try connecting again
          </button>
        )}
        {status === "on" && (
          <button
            type="button"
            onClick={() => {
              sendTest()
                .then(() => toast({ message: "Test push sent" }))
                .catch(() =>
                  toast({ message: "Test push couldn’t be delivered" }),
                );
            }}
            className="mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-inset px-4 text-caption font-semibold text-ink transition-transform active:scale-[0.97]"
          >
            <Send className="size-4" strokeWidth={1.9} aria-hidden="true" />
            Send a test push
          </button>
        )}
      </div>
    </div>
  );
}
