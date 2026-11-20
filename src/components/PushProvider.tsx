"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { onLotteryLogChange, readLotteryLog } from "@/lib/entries";
import { useApp } from "@/lib/store";

/**
 * This device's push subscription, app-wide. Lives above every page so a
 * Follow on a show page reaches the server at once, and so the server's copy
 * of follows and lottery entries is re-synced on every visit (a pruned or
 * lost row heals itself). docs/NOTIFICATIONS.md, step 1.
 */

export type PushSupport =
  | "checking"
  | "not-configured" // this build has no VAPID key
  | "needs-install" // iPhone or iPad Safari tab: Apple requires Home Screen
  | "unsupported"
  | "ready";

export type PushError = "registration-failed" | "subscribe-failed" | "save-failed";

export type TestPushResult =
  | { status: "delivered"; title: string }
  | { status: "sent-not-shown"; title: string }
  | { status: "failed"; reason: "rate-limited" | "expired" | "error" };

type PushAlerts = {
  support: PushSupport;
  permission: NotificationPermission | null;
  subscribed: boolean;
  busy: boolean;
  error: PushError | null;
  /** Call straight from a click: the permission prompt needs the gesture. */
  enable: () => Promise<boolean>;
  disable: () => Promise<void>;
  sendTest: () => Promise<TestPushResult>;
};

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
/** Set while the user wants alerts here, so a lost subscription is renewed. */
const WANTED_KEY = "matinee-push-wanted-v1";
const SYNC_DEBOUNCE_MS = 400;
const TEST_DISPLAY_WAIT_MS = 8_000;

const PushContext = createContext<PushAlerts | null>(null);

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

function sameKey(a: ArrayBuffer | null | undefined, b: Uint8Array): boolean {
  if (!a) return false;
  const left = new Uint8Array(a);
  return left.length === b.length && left.every((byte, i) => byte === b[i]);
}

function detectSupport(): PushSupport {
  if (!VAPID_PUBLIC_KEY) return "not-configured";
  const ua = navigator.userAgent;
  const appleMobile =
    /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (appleMobile && !standalone) return "needs-install";
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return "unsupported";
  }
  return "ready";
}

const readWanted = () => {
  try {
    return localStorage.getItem(WANTED_KEY) === "1";
  } catch {
    return false;
  }
};
const writeWanted = (wanted: boolean) => {
  try {
    if (wanted) localStorage.setItem(WANTED_KEY, "1");
    else localStorage.removeItem(WANTED_KEY);
  } catch {
    // Private mode: renewal just won't happen.
  }
};

async function saveSubscription(
  sub: PushSubscription,
  slugs: string[],
  previousEndpoint?: string,
) {
  const entries = readLotteryLog().map(({ key, day }) => ({ key, day }));
  const response = await fetch("/api/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription: sub.toJSON(),
      slugs,
      entries,
      previousEndpoint,
    }),
  });
  if (!response.ok) throw new Error(`sync failed (${response.status})`);
}

export function PushProvider({ children }: { children: React.ReactNode }) {
  const { follows, hydrated } = useApp();
  const [support, setSupport] = useState<PushSupport>("checking");
  const [permission, setPermission] = useState<NotificationPermission | null>(
    null,
  );
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<PushError | null>(null);
  const [logVersion, setLogVersion] = useState(0);
  const displayed = useRef(new Map<string, () => void>());
  // Tags shown before anyone waited for them (the push can beat the response).
  const recentlyShown = useRef(new Set<string>());

  // Paused follows stay listed in the app but must not reach the server.
  const slugs = useMemo(
    () => follows.filter((f) => f.enabled).map((f) => f.show.slug),
    [follows],
  );
  const slugsKey = slugs.join(",");
  const slugsRef = useRef(slugs);
  useEffect(() => {
    slugsRef.current = slugs;
  }, [slugs]);

  const subscribeWithKey = useCallback(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
    });
  }, []);

  // Detect, register the worker, and find (or renew) this device's subscription.
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const detected = detectSupport();
      if (detected !== "ready") {
        setSupport(detected);
        return;
      }
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        let sub = await registration.pushManager.getSubscription();
        const key = urlBase64ToUint8Array(VAPID_PUBLIC_KEY!);
        let previousEndpoint: string | undefined;
        // VAPID keys rotated since this device subscribed: renew silently.
        if (sub && !sameKey(sub.options.applicationServerKey, key)) {
          previousEndpoint = sub.endpoint;
          await sub.unsubscribe();
          sub = null;
        }
        if (
          !sub &&
          (readWanted() || previousEndpoint) &&
          Notification.permission === "granted"
        ) {
          sub = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: key,
          });
          if (previousEndpoint) {
            await saveSubscription(sub, slugsRef.current, previousEndpoint).catch(
              () => {},
            );
          }
        }
        if (cancelled) return;
        setSubscription(sub);
        setPermission(Notification.permission);
        setSupport("ready");
      } catch {
        if (cancelled) return;
        setSupport("ready");
        setPermission("Notification" in window ? Notification.permission : null);
        setError("registration-failed");
      }
    };
    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  // The worker reports each push it displays (the test push waits on this).
  useEffect(() => {
    if (support !== "ready") return;
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; tag?: string } | null;
      if (data?.type !== "matinee-push" || !data.tag) return;
      const tag = data.tag;
      const waiter = displayed.current.get(tag);
      if (waiter) return waiter();
      recentlyShown.current.add(tag);
      setTimeout(() => recentlyShown.current.delete(tag), 30_000);
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [support]);

  useEffect(() => onLotteryLogChange(() => setLogVersion((v) => v + 1)), []);

  // Keep the server's copy current: on load, on follow changes, on entries.
  // Waits for hydration so the empty pre-hydration list never overwrites it.
  useEffect(() => {
    if (!hydrated || !subscription) return;
    const timer = setTimeout(() => {
      saveSubscription(subscription, slugsKey ? slugsKey.split(",") : [])
        .then(() => setError(null))
        .catch(() => setError("save-failed"));
    }, SYNC_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [hydrated, subscription, slugsKey, logVersion]);

  const enable = useCallback(async (): Promise<boolean> => {
    if (support !== "ready" || !VAPID_PUBLIC_KEY) return false;
    // First statement, so the prompt runs inside the click's user activation.
    const asked =
      Notification.permission === "default"
        ? Notification.requestPermission()
        : Promise.resolve(Notification.permission);
    setBusy(true);
    setError(null);
    try {
      const result = await asked;
      setPermission(result);
      if (result !== "granted") return false;
      const sub = subscription ?? (await subscribeWithKey());
      try {
        await saveSubscription(sub, slugsRef.current);
      } catch {
        setSubscription(sub);
        setError("save-failed");
        return false;
      }
      writeWanted(true);
      setSubscription(sub);
      return true;
    } catch {
      setError("subscribe-failed");
      return false;
    } finally {
      setBusy(false);
    }
  }, [support, subscription, subscribeWithKey]);

  const disable = useCallback(async () => {
    const sub = subscription;
    writeWanted(false);
    setSubscription(null);
    setError(null);
    if (!sub) return;
    try {
      await fetch("/api/push", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
    } catch {
      // The browser-side unsubscribe below still stops delivery; the server
      // prunes the row on its first 404/410.
    }
    await sub.unsubscribe().catch(() => {});
  }, [subscription]);

  const sendTest = useCallback(async (): Promise<TestPushResult> => {
    if (!subscription) return { status: "failed", reason: "error" };
    let response: Response;
    try {
      response = await fetch("/api/push", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
    } catch {
      return { status: "failed", reason: "error" };
    }
    if (response.status === 429) return { status: "failed", reason: "rate-limited" };
    if (response.status === 410) {
      setSubscription(null);
      return { status: "failed", reason: "expired" };
    }
    if (!response.ok) return { status: "failed", reason: "error" };
    const { title, tag } = (await response.json()) as { title: string; tag: string };

    // Did this device actually display it? The worker says so when it does.
    const shown = recentlyShown.current.has(tag) || (await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        displayed.current.delete(tag);
        resolve(false);
      }, TEST_DISPLAY_WAIT_MS);
      displayed.current.set(tag, () => {
        clearTimeout(timer);
        displayed.current.delete(tag);
        resolve(true);
      });
    }));
    return { status: shown ? "delivered" : "sent-not-shown", title };
  }, [subscription]);

  const value = useMemo<PushAlerts>(
    () => ({
      support,
      permission,
      subscribed: subscription !== null,
      busy,
      error,
      enable,
      disable,
      sendTest,
    }),
    [support, permission, subscription, busy, error, enable, disable, sendTest],
  );

  return <PushContext.Provider value={value}>{children}</PushContext.Provider>;
}

export function usePushAlerts(): PushAlerts {
  const context = useContext(PushContext);
  if (!context) throw new Error("usePushAlerts must be used within PushProvider");
  return context;
}
