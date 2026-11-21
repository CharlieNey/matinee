import { describe, expect, it } from "vitest";
import {
  CONTACT_EMAIL,
  formatCheckedDate,
  formatCheckedRange,
  reportProblemHref,
} from "@/lib/contact";
import { programsForShow } from "@/lib/programs";
import { getShow } from "@/lib/shows";

function decode(href: string) {
  const url = new URL(href);
  return {
    to: url.pathname,
    subject: url.searchParams.get("subject") ?? "",
    body: url.searchParams.get("body") ?? "",
  };
}

describe("report-a-problem links", () => {
  const show = getShow("chicago")!;
  const program = programsForShow("chicago")[0];

  it("prefills a program report with everything needed to find the row", () => {
    const { to, subject, body } = decode(reportProblemHref(show, program));
    expect(to).toBe(CONTACT_EMAIL);
    expect(subject).toContain("Chicago");
    expect(subject).toContain(`$${program.price}`);
    expect(body).toContain(`Key: chicago/${program.kind}/${program.platform}`);
    expect(body).toContain(`Last checked: ${program.lastVerified}`);
    expect(body).toContain("Page: https://matinee.nyc/shows/chicago");
  });

  it("prefills a show report without program lines", () => {
    const { subject, body } = decode(reportProblemHref(show));
    expect(subject).toBe("Problem with a listing: Chicago");
    expect(body).not.toContain("Key:");
    expect(body).toContain("Page: https://matinee.nyc/shows/chicago");
  });
});

describe("checked dates", () => {
  it("formats a single date the same in every time zone", () => {
    expect(formatCheckedDate("2026-11-20")).toBe("Nov 20");
    expect(formatCheckedDate("2026-01-01")).toBe("Jan 1");
  });

  it("names the range from the oldest row to the newest", () => {
    expect(formatCheckedRange("2026-11-20", "2026-11-20")).toBe("November 20");
    expect(formatCheckedRange("2026-11-11", "2026-11-20")).toBe(
      "November 11–20",
    );
    expect(formatCheckedRange("2026-10-30", "2026-11-20")).toBe(
      "October 30 – November 20",
    );
  });
});
