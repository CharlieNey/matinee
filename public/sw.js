self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag,
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const raw =
    (event.notification.data && event.notification.data.url) || "/rush";
  // Defense in depth: payloads are VAPID-signed, but never open off-origin.
  let url;
  try {
    url = new URL(raw, self.location.origin);
    if (url.origin !== self.location.origin) {
      url = new URL("/rush", self.location.origin);
    }
  } catch {
    url = new URL("/rush", self.location.origin);
  }
  event.waitUntil(clients.openWindow(url.href));
});
