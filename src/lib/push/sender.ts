import { createHash } from "node:crypto";
import webpush from "web-push";
import type { PushMessage } from "./copy";

export type PushTarget = { endpoint: string; p256dh: string; auth: string };

export type PushDelivery = {
  message: PushMessage;
  /** Seconds the push service may hold it for an offline device. */
  ttlSeconds: number;
  urgency: "high" | "normal";
};

/** Sends one push; throws an error carrying the push service's statusCode. */
export type PushSender = (
  target: PushTarget,
  delivery: PushDelivery,
) => Promise<void>;

export type SendOutcome = "sent" | "gone" | "rejected" | "transient";

/**
 * 404/410: the subscription is gone for good. Other 4xx: this message will
 * never be accepted (403 is a VAPID mismatch, or our own misconfiguration,
 * so it is not grounds to delete). 408/429/5xx/network: try again later.
 */
export function classifySendError(error: unknown): Exclude<SendOutcome, "sent"> {
  const status = (error as { statusCode?: unknown } | null)?.statusCode;
  if (status === 404 || status === 410) return "gone";
  if (
    typeof status === "number" &&
    status >= 400 &&
    status < 500 &&
    status !== 408 &&
    status !== 429
  ) {
    return "rejected";
  }
  return "transient";
}

/**
 * Web Push Topic: the push service replaces an undelivered message with the
 * same topic. At most 32 URL-safe base64 characters.
 */
export function pushTopic(tag: string): string {
  return createHash("sha256").update(tag).digest("base64url").slice(0, 32);
}

export type VapidConfig = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

export function vapidFromEnv(): VapidConfig | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;
  return {
    publicKey,
    privateKey,
    subject: process.env.VAPID_SUBJECT ?? "mailto:hello@example.com",
  };
}

/** The real sender: web-push with VAPID, TTL, Urgency and Topic. */
export function webPushSender(vapid: VapidConfig): PushSender {
  return async (target, delivery) => {
    await webpush.sendNotification(
      {
        endpoint: target.endpoint,
        keys: { p256dh: target.p256dh, auth: target.auth },
      },
      JSON.stringify(delivery.message),
      {
        vapidDetails: vapid,
        TTL: Math.max(0, Math.floor(delivery.ttlSeconds)),
        urgency: delivery.urgency,
        topic: pushTopic(delivery.message.tag),
        timeout: 10_000,
      },
    );
  };
}
