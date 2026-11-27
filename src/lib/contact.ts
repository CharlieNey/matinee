import {
  type Program,
  programKey,
  programKindLabel,
  programPlatformLabel,
} from "@/lib/programs";
import type { Show } from "@/lib/shows";

/**
 * The one address visitors write to. Every "Report a wrong fact" link uses
 * it while REPORT_TO is set to email.
 *
 * Charlie's own address for now (his call, 2026-11-27): hello@matinee.nyc has
 * no MX record yet, so mail to it bounces. Switch back once forwarding is set
 * up (docs/GO-LIVE.md step 3). The address is public in the page source.
 */
export const CONTACT_EMAIL = "charlieney@gmail.com";

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

const checkedLongFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "long",
  day: "numeric",
});

/** "2026-11-20" → "November 20". */
export function formatCheckedLong(isoDate: string): string {
  return checkedLongFormat.format(new Date(`${isoDate}T12:00:00Z`));
}

/**
 * Where "Report a wrong fact" sends a visitor. This is the one setting:
 *
 * - `email`: a prefilled email (the default).
 * - `github`: a prefilled issue on the public repo. Needs a GitHub account,
 *   and the report is public.
 * - `form`: any form that reads query parameters (Tally, Fillout and
 *   Formspree do). It gets `subject` and `details`.
 */
export type ReportDestination =
  | { kind: "email"; to: string }
  | { kind: "github"; repo: string }
  | { kind: "form"; url: string };

export const REPORT_TO: ReportDestination = {
  kind: "email",
  to: CONTACT_EMAIL,
};

/**
 * A report link prefilled with everything needed to find the row: the show,
 * and for a program its kind, platform, price, key, source and check date.
 * The visitor only has to say what's wrong.
 */
export function reportWrongFactHref(
  show: Show,
  program?: Program,
  destination: ReportDestination = REPORT_TO,
): string {
  const subject = program
    ? `Wrong fact: ${show.title}, ${programKindLabel(program.kind)} $${program.price}`
    : `Wrong fact: ${show.title}`;
  const details = [
    `Show: ${show.title}`,
    ...(program
      ? [
          `Program: ${programKindLabel(program.kind)}, $${program.price}, ${programPlatformLabel(program.platform)}`,
          `Key: ${programKey(program)}`,
          `Last checked: ${program.lastVerified}`,
          `Source: ${program.source}`,
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
  ];

  switch (destination.kind) {
    case "email":
      return `mailto:${destination.to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.join("\r\n"))}`;
    case "github": {
      const url = new URL(`https://github.com/${destination.repo}/issues/new`);
      url.searchParams.set("title", subject);
      url.searchParams.set("body", body.join("\n"));
      return url.toString();
    }
    case "form": {
      const url = new URL(destination.url);
      url.searchParams.set("subject", subject);
      url.searchParams.set("details", details.join("\n"));
      return url.toString();
    }
  }
}

/** Email opens the mail app; the other destinations open a new tab. */
export function reportOpensNewTab(
  destination: ReportDestination = REPORT_TO,
): boolean {
  return destination.kind !== "email";
}
