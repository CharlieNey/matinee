"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { onLotteryLogChange, readLotteryLog } from "./entries";

export type PushStatus =
  | "unavailable" // browser can't, or the app isn't configured for push
  | "loading"
  | "off"
  | "denied"
  | "on"
  | "error";

export type PushUnavailableReason =
  | "not-configured"
  | "unsupported"
  | "registration-failed"
  | "backend-unavailable"
  | "subscribe-failed"
  | null;

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function saveSubscription(sub: PushSubscription, slugs: string[]) {
  const entries = readLotteryLog().map(({ key, day }) => ({ key, day }));
  const response = await fetch("/api/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON(), slugs, entries }),
  });
  if (!response.ok) {
    throw new Error(`Push subscription sync failed (${response.status})`);
  }
}

/**
 * Web-push subscription state for deadline notifications. `slugs` is the
 * list of show slugs the subscriber follows; it re-syncs to the server
 * whenever it changes while subscribed.
 */
export function usePush(slugs: string[]) {
  const [status, setStatus] = useState<PushStatus>("loading");
  const [reason, setReason] = useState<PushUnavailableReason>(null);
  const subscriptionRef = useRef<PushSubscription | null>(null);
  const slugsKey = slugs.join(",");

  useEffect(() => {
    let cancelled = false;
    const init = async (): Promise<{
      status: PushStatus;
      reason: PushUnavailableReason;
    } | null> => {
      if (!VAPID_PUBLIC_KEY) {
        return { status: "unavailable", reason: "not-configured" };
      }
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        return { status: "unavailable", reason: "unsupported" };
      }
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        const sub = await registration.pushManager.getSubscription();
        if (cancelled) return null;
        subscriptionRef.current = sub;
        if (sub) return { status: "on", reason: null };
        return {
          status: Notification.permission === "denied" ? "denied" : "off",
          reason: null,
        };
      } catch {
        return { status: "unavailable", reason: "registration-failed" };
      }
    };
    init().then((next) => {
      if (!cancelled && next) {
        setStatus(next.status);
        setReason(next.reason);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the server's copy of followed shows current while subscribed.
  useEffect(() => {
    const sub = subscriptionRef.current;
    if (status !== "on" || !sub) return;
    saveSubscription(sub, slugsKey ? slugsKey.split(",") : [])
      .then(() => setReason(null))
      .catch(() => {
        setStatus("error");
        setReason("backend-unavailable");
      });
  }, [status, slugsKey]);

  // Re-sync when the "I entered" log changes, so claim watches can arm.
  useEffect(() => {
    if (status !== "on") return;
    return onLotteryLogChange(() => {
      const sub = subscriptionRef.current;
      if (!sub) return;
      saveSubscription(sub, slugsKey ? slugsKey.split(",") : []).catch(
        () => {},
      );
    });
  }, [status, slugsKey]);

  const subscribe = useCallback(async () => {
    if (!VAPID_PUBLIC_KEY) return;
    setStatus("loading");
    setReason(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }));
      subscriptionRef.current = sub;
      await saveSubscription(sub, slugsKey ? slugsKey.split(",") : []);
      setStatus("on");
      setReason(null);
    } catch {
      if (Notification.permission === "denied") {
        setStatus("denied");
        setReason(null);
      } else {
        setStatus("error");
        setReason(
          subscriptionRef.current
            ? "backend-unavailable"
            : "subscribe-failed",
        );
      }
    }
  }, [slugsKey]);

  const unsubscribe = useCallback(async () => {
    const sub = subscriptionRef.current;
    setStatus("off");
    if (!sub) return;
    subscriptionRef.current = null;
    try {
      await fetch("/api/push", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
    } catch {
      // Losing the race here is fine — the cron prunes dead endpoints.
    }
  }, []);

  const sendTest = useCallback(async () => {
    const subscription = subscriptionRef.current;
    if (!subscription) throw new Error("No push subscription");
    const response = await fetch("/api/push", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
    if (!response.ok) throw new Error(`Test push failed (${response.status})`);
  }, []);

  return { status, reason, subscribe, unsubscribe, sendTest };
}
