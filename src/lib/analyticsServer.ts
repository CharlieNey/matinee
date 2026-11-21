/**
 * Server-side events through PostHog's capture API (POST /batch/), off unless
 * NEXT_PUBLIC_POSTHOG_KEY is set. The project token is public by design, so
 * the browser and the server share it. Events carry no person: one fixed
 * distinct_id and `$process_person_profile: false`.
 */

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "";
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
const SERVER_DISTINCT_ID = "matinee-server";

export type ServerEvent = {
  event: "push_sent";
  properties: Record<string, string | number | boolean | null>;
};

/**
 * Best effort: a slow or failing PostHog never delays or fails the caller
 * by more than the timeout, and never throws.
 */
export async function captureServerEvents(
  events: readonly ServerEvent[],
  fetcher: typeof fetch = fetch,
): Promise<void> {
  if (!KEY || events.length === 0) return;
  try {
    await fetcher(`${HOST}/batch/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: KEY,
        batch: events.map(({ event, properties }) => ({
          event,
          properties: {
            ...properties,
            distinct_id: SERVER_DISTINCT_ID,
            $process_person_profile: false,
          },
        })),
      }),
      signal: AbortSignal.timeout(2_000),
    });
  } catch {
    // Analytics must never break a push run.
  }
}
