import {
  type Program,
  programKey,
  programKindLabel,
  programPlatformLabel,
} from "@/lib/programs";
import type { Show } from "@/lib/shows";

/**
 * The one address visitors write to, used by every "Report a problem" link.
 *
 * TODO(Charlie): matinee.nyc had no MX record when this was added
 * (2026-11-21), so mail to this address bounces until forwarding is set up
 * at the registrar, or until this constant points at a real inbox. It is the
 * only place the address lives.
 */
export const CONTACT_EMAIL = "hello@matinee.nyc";

/** Canonical origin, so a report names the page even when sent from a preview. */
export const SITE_URL = "https://matinee.nyc";

const checkedFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
});

/** "2026-11-20" → "Nov 20". */
export function formatCheckedDate(isoDate: string): string {
  return checkedFormat.format(new Date(`${isoDate}T12:00:00Z`));
}

const monthFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "long",
});

/** "November 20", "November 11–20", or "October 30 – November 20". */
export function formatCheckedRange(oldest: string, newest: string): string {
  const long = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
      timeZone: "UTC",
      month: "long",
      day: "numeric",
    });
  if (oldest === newest) return long(newest);
  const a = new Date(`${oldest}T12:00:00Z`);
  const b = new Date(`${newest}T12:00:00Z`);
  const sameMonth =
    monthFormat.format(a) === monthFormat.format(b) &&
    a.getUTCFullYear() === b.getUTCFullYear();
  if (sameMonth) {
    return `${long(oldest)}–${b.getUTCDate()}`;
  }
  return `${long(oldest)} – ${long(newest)}`;
}

/**
 * A mailto link prefilled with everything needed to find the row: the show,
 * and for a program its kind, platform, price, key and check date. The
 * visitor only has to say what's wrong.
 */
export function reportProblemHref(show: Show, program?: Program): string {
  const subject = program
    ? `Problem with a listing: ${show.title}, ${programKindLabel(program.kind)} $${program.price}`
    : `Problem with a listing: ${show.title}`;
  const details = [
    `Show: ${show.title}`,
    ...(program
      ? [
          `Program: ${programKindLabel(program.kind)}, $${program.price}, ${programPlatformLabel(program.platform)}`,
          `Key: ${programKey(program)}`,
          `Last checked: ${program.lastVerified}`,
        ]
      : []),
    `Page: ${SITE_URL}/shows/${show.slug}`,
  ];
  const body = [
    "What's wrong? (price, hours, link, or something else)",
    "",
    "",
    "",
    "Listing details, so we can find it:",
    ...details,
  ].join("\r\n");
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
