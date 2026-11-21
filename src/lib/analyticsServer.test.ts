import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function load(key: string) {
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", key);
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://ph.example");
  return import("@/lib/analyticsServer");
}

const event = {
  event: "push_sent" as const,
  properties: { show: "chicago", kinds: "opening", alerts: 1 },
};

describe("server analytics", () => {
  it("sends nothing without a key", async () => {
    const { captureServerEvents } = await load("");
    const fetcher = vi.fn();
    await captureServerEvents([event], fetcher);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("batches events with no person attached", async () => {
    const { captureServerEvents } = await load("phc_test");
    const fetcher = vi.fn().mockResolvedValue(new Response("{}"));
    await captureServerEvents([event, event], fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("https://ph.example/batch/");
    const body = JSON.parse(init.body);
    expect(body.api_key).toBe("phc_test");
    expect(body.batch).toHaveLength(2);
    expect(body.batch[0].properties).toMatchObject({
      show: "chicago",
      distinct_id: "matinee-server",
      $process_person_profile: false,
    });
  });

  it("never throws when PostHog is down", async () => {
    const { captureServerEvents } = await load("phc_test");
    const fetcher = vi.fn().mockRejectedValue(new Error("offline"));
    await expect(captureServerEvents([event], fetcher)).resolves.toBeUndefined();
  });
});
