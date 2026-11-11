"use client";

export function reportClientError(error: Error & { digest?: string }): void {
  const payload = JSON.stringify({
    message: error.message.slice(0, 1_000),
    stack: error.stack?.slice(0, 8_000) ?? null,
    digest: error.digest?.slice(0, 200) ?? null,
    path: window.location.pathname,
  });
  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      "/api/client-errors",
      new Blob([payload], { type: "application/json" }),
    );
    return;
  }
  void fetch("/api/client-errors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  });
}
