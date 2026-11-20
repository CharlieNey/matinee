/**
 * The server POSTs to whatever endpoint a browser registered, so only real
 * push services are accepted; anything else would let a caller aim the
 * server at an arbitrary URL.
 */
const PUSH_SERVICE_HOSTS = [
  "fcm.googleapis.com", // Chrome, Edge on Android, Opera, Brave, Samsung
  "android.googleapis.com", // older Chrome subscriptions
  ".push.services.mozilla.com", // Firefox
  ".push.apple.com", // Safari and installed iOS web apps
  ".notify.windows.com", // Edge on Windows
] as const;

export function isPushServiceEndpoint(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 1000) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.port !== "" || url.username) {
    return false;
  }
  const host = url.hostname.toLowerCase();
  return PUSH_SERVICE_HOSTS.some((allowed) =>
    allowed.startsWith(".") ? host.endsWith(allowed) : host === allowed,
  );
}
