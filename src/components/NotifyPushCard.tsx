"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { TestPushResult, usePushAlerts } from "@/components/PushProvider";
import { Toggle } from "@/components/Toggle";
import { useApp } from "@/lib/store";

function testResultLine(result: TestPushResult | "sending"): string {
  if (result === "sending") return "Sending…";
  switch (result.status) {
    case "delivered":
      return `Delivered to this device: “${result.title}”. No banner? Allow notifications for this browser in your system settings.`;
    case "sent-not-shown":
      return `Sent “${result.title}”, but this device hasn’t shown it yet. Check that notifications for this browser are allowed in system settings and that Focus is off.`;
    case "failed":
      return result.reason === "rate-limited"
        ? "That’s three tests in ten minutes. Try again shortly."
        : result.reason === "expired"
          ? "This device’s subscription expired. Turn alerts off and on again."
          : "The test couldn’t be sent. Try again in a minute.";
  }
}

/**
 * The device switch for alerts. Every state says what is true: unsupported
 * browsers, a blocked permission and an iPhone tab before Add to Home Screen
 * each get their own words, never a dead toggle.
 */
export function NotifyPushCard() {
  const { follows } = useApp();
  const push = usePushAlerts();
  const [test, setTest] = useState<TestPushResult | "sending" | null>(null);
  const followed = follows.filter((follow) => follow.enabled).length;

  const unavailable =
    push.support === "not-configured" || push.support === "unsupported";
  const showToggle =
    push.support === "ready" && push.permission !== "denied";

  const caption = (() => {
    switch (push.support) {
      case "checking":
        return "Checking this browser…";
      case "not-configured":
        return "Alerts aren’t connected in this build. Following still works, and every window stays live on the show pages.";
      case "unsupported":
        return "This browser can’t receive web push. Following still works, and every window stays live on the show pages.";
      case "needs-install":
        return null;
    }
    if (push.permission === "denied") {
      return "Notifications are blocked for this site. Allow them in your browser’s site settings, then come back here.";
    }
    if (push.error === "save-failed") {
      return "Your browser is ready, but Matinee couldn’t save the subscription. Try again.";
    }
    if (push.error === "subscribe-failed" || push.error === "registration-failed") {
      return "Matinee couldn’t start alerts in this browser. Reload, or try another browser.";
    }
    if (push.subscribed) {
      return followed > 0
        ? `On for ${followed} followed show${followed === 1 ? "" : "s"} on this device.`
        : "On for this device. Follow a show below and its windows are covered.";
    }
    return "A push 5 minutes before a followed show’s rush opens, when its lottery opens, and an hour before the lottery closes. Nothing between 10 PM and 8 AM.";
  })();

  return (
    <div className="mt-3.5 rounded-card bg-paper p-5">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-title">Deadline alerts</h2>
            {(unavailable || push.support === "needs-install") && (
              <span className="rounded-full bg-inset px-2 py-1 text-label font-semibold text-ink-soft">
                {push.support === "needs-install"
                  ? "Needs Home Screen"
                  : "Unavailable here"}
              </span>
            )}
          </div>
          {caption && (
            <p className="mt-1 text-body text-ink-soft" aria-live="polite">
              {caption}
            </p>
          )}
          {push.support === "needs-install" && (
            <div className="mt-1 text-body text-ink-soft">
              <p>Apple delivers web push only to apps on the Home Screen (iOS 16.4 or later).</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>Tap Share in Safari’s toolbar.</li>
                <li>Choose Add to Home Screen.</li>
                <li>Open Matinee from the new icon and turn alerts on here.</li>
              </ol>
            </div>
          )}
        </div>
        {showToggle && (
          <Toggle
            on={push.subscribed}
            onChange={(next) => {
              if (push.busy) return;
              setTest(null);
              if (next) void push.enable();
              else void push.disable();
            }}
            label="Rush and lottery deadline alerts on this device"
          />
        )}
      </div>
      <div className="mt-4 border-t border-line pt-3.5">
        <p className="text-caption text-ink-soft">
          <b className="font-semibold text-ink">Lottery → rush → TKTS.</b>{" "}
          Alerts cover the first two; the live board is always waiting as your fallback.
        </p>
        {push.support === "ready" && push.error === "save-failed" && (
          <button
            type="button"
            onClick={() => void push.enable()}
            disabled={push.busy}
            className="mt-3 h-10 rounded-full bg-espresso px-4 text-caption font-semibold text-white transition-transform active:scale-[0.97]"
          >
            Try again
          </button>
        )}
        {push.subscribed && (
          <>
            <button
              type="button"
              disabled={test === "sending"}
              onClick={() => {
                setTest("sending");
                void push.sendTest().then(setTest);
              }}
              className="mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-inset px-4 text-caption font-semibold text-ink transition-transform active:scale-[0.97] disabled:opacity-60"
            >
              <Send className="size-4" strokeWidth={1.9} aria-hidden="true" />
              Send a test push
            </button>
            <p className="mt-2 min-h-[1lh] text-caption text-ink-soft" aria-live="polite">
              {test ? testResultLine(test) : ""}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
