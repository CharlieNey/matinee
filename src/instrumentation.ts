import type { Instrumentation } from "next";

/** Server-side uncaught errors become structured events in Vercel Logs. */
export const onRequestError: Instrumentation.onRequestError = (
  error,
  request,
  context,
) => {
  const message = error instanceof Error ? error.message : String(error);
  const digest =
    typeof error === "object" && error !== null && "digest" in error
      ? String(error.digest)
      : null;
  console.error(
    JSON.stringify({
      event: "server_error",
      message,
      digest,
      method: request.method,
      path: request.path,
      route: context.routePath,
      routeType: context.routeType,
      reportedAt: new Date().toISOString(),
    }),
  );
};
