"use client";

import Link from "next/link";
import { usePushAlerts } from "@/components/PushProvider";
import { useToast } from "@/components/Toast";
import { track } from "@/lib/analytics";
import { nextAlertSummary } from "@/lib/push/copy";
import { useApp } from "@/lib/store";
import { Show } from "@/lib/shows";
import { useNow } from "@/lib/useNow";

const linkClass =
  "underline underline-offset-2 transition-opacity active:opacity-60";

/**
 * The show page's engagement action. Following is the moment Matinee asks
 * for notification permission: the user has just asked to be told about
 * this show. It asks only if the browser never has, and the follow stands
 * whatever the answer.
 */
export function FollowShowCard({ show }: { show: Show }) {
  const { follows, toggleFollow, setFollowEnabled } = useApp();
  const push = usePushAlerts();
  const toast = useToast();
  const now = useNow();
  const follow = follows.find((item) => item.show.slug === show.slug);
  const following = follow !== undefined;
  const enabled = follow?.enabled ?? false;
  const next = now && following && enabled ? nextAlertSummary(show.slug, now) : null;

  const onFollow = async () => {
    if (follow && !enabled) {
      setFollowEnabled(follow.id, true);
      toast({ message: `${show.title} alerts resumed` });
      return;
    }
    if (following) {
      toggleFollow(show);
      toast({ message: `Unfollowed ${show.title}` });
      return;
    }
    toggleFollow(show);
    track("show_followed", { show: show.slug });
    const ask =
      push.support === "ready" &&
      push.permission === "default" &&
      !push.subscribed;
    if (!ask) {
      toast({ message: `Following ${show.title}` });
      return;
    }
    // Inside the click: the browser's prompt needs the gesture.
    const on = await push.enable();
    toast({
      message: on
        ? `Following ${show.title}. Alerts are on.`
        : `Following ${show.title}. Alerts are off on this device.`,
    });
  };

  const caption = (() => {
    if (!following) return "Get a push when a rush or lottery window opens";
    if (!enabled) return "This show stays saved here until you resume alerts";
    if (push.subscribed) {
      return (
        <>
          {next
            ? `Alerts on. Next one ${next.at}, for the ${next.kind}.`
            : "Alerts on for this device."}{" "}
          <Link href="/notify" className={linkClass}>
            Manage
          </Link>
        </>
      );
    }
    switch (push.support) {
      case "checking":
        return "Checking this browser…";
      case "needs-install":
        return (
          <>
            On iPhone, alerts need Matinee on your Home Screen.{" "}
            <Link href="/notify" className={linkClass}>
              How
            </Link>
          </>
        );
      case "unsupported":
      case "not-configured":
        return "This browser can’t receive alerts. The windows below stay live.";
    }
    if (push.permission === "denied") {
      return "Notifications are blocked for this site in your browser settings.";
    }
    return (
      <>
        Alerts are off on this device.{" "}
        <button
          type="button"
          onClick={() => void push.enable()}
          disabled={push.busy}
          className={linkClass}
        >
          Turn on
        </button>
      </>
    );
  })();


  return (
    <div className="flex items-center gap-3.5 rounded-card bg-paper px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold">
          {following
            ? enabled
              ? "Following this show"
              : "Alerts paused"
            : "Follow this show"}
        </p>
        <p className="mt-0.5 text-caption text-ink-soft" aria-live="polite">
          {caption}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void onFollow()}
        disabled={push.busy}
        className={`h-10 shrink-0 rounded-full px-4 text-caption font-semibold transition-[background-color,color,transform] duration-200 active:scale-[0.96] disabled:opacity-60 ${
          following && enabled ? "bg-inset text-ink" : "bg-espresso text-white"
        }`}
      >
        {following ? (enabled ? "Following" : "Resume") : "Follow"}
      </button>
    </div>
  );
}
