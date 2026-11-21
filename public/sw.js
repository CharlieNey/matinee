/* Matinee service worker: web push only (docs/NOTIFICATIONS.md). */

// A new worker takes over at once, so a deploy's push handling is live.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    return;
  }
  event.waitUntil(
    (async () => {
      // Same tag replaces: a recovered duplicate never stacks a second banner.
      await self.registration.showNotification(data.title, {
        body: data.body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: data.tag,
        data: { url: data.url },
      });
      // Tell open pages it was displayed (the test push waits for this).
      const pages = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const page of pages) {
        page.postMessage({ type: "matinee-push", tag: data.tag });
      }
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const raw =
    (event.notification.data && event.notification.data.url) || "/rush";
  // Payloads are VAPID-signed, but never open off-origin.
  let url;
  try {
    url = new URL(raw, self.location.origin);
    if (url.origin !== self.location.origin) {
      url = new URL("/rush", self.location.origin);
    }
  } catch {
    url = new URL("/rush", self.location.origin);
  }
  // The landing page counts the open (only if analytics is on) and strips it.
  url.searchParams.set("via", "push");
  event.waitUntil(
    (async () => {
      // Reuse an open Matinee tab or installed window before opening another.
      const pages = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const page = pages.find((client) => "focus" in client);
      if (page) {
        await page.focus();
        if ("navigate" in page) {
          await page.navigate(url.href).catch(() => self.clients.openWindow(url.href));
        }
        return;
      }
      await self.clients.openWindow(url.href);
    })(),
  );
});

// The push service rotated this device's subscription (mostly Firefox).
// Re-subscribe with the same key and move the follows to the new endpoint.
self.addEventListener("pushsubscriptionchange", (event) => {
  const previous = event.oldSubscription;
  const key = previous && previous.options && previous.options.applicationServerKey;
  if (!key) return; // The page renews it on the next visit.
  event.waitUntil(
    (async () => {
      const next =
        event.newSubscription ||
        (await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        }));
      await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: next.toJSON(),
          previousEndpoint: previous.endpoint,
        }),
      });
    })(),
  );
});
