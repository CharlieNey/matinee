import { describe, expect, it } from "vitest";
import {
  CONTACT_EMAIL,
  formatCheckedDate,
  formatCheckedLong,
  REPORT_TO,
  reportOpensNewTab,
  reportWrongFactHref,
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

describe("report-a-wrong-fact links", () => {
  const show = getShow("chicago")!;
  const program = programsForShow("chicago")[0];

  it("defaults to a prefilled email to the site's contact address", () => {
    expect(REPORT_TO).toEqual({ kind: "email", to: CONTACT_EMAIL });
    expect(reportOpensNewTab()).toBe(false);
  });

  it("prefills a program report with everything needed to find the row", () => {
    const { to, subject, body } = decode(reportWrongFactHref(show, program));
    expect(to).toBe(CONTACT_EMAIL);
    expect(subject).toContain("Chicago");
    expect(subject).toContain(`$${program.price}`);
    expect(body).toContain(`Key: chicago/${program.kind}/${program.platform}`);
    expect(body).toContain(`Last checked: ${program.lastVerified}`);
    expect(body).toContain(`Source: ${program.source}`);
    expect(body).toContain("Page: https://matinee.nyc/shows/chicago");
  });

  it("prefills a show report without program lines", () => {
    const { subject, body } = decode(reportWrongFactHref(show));
    expect(subject).toBe("Wrong fact: Chicago");
    expect(body).not.toContain("Key:");
    expect(body).toContain("Page: https://matinee.nyc/shows/chicago");
  });

  it("can send the same report to a GitHub issue instead", () => {
    const url = new URL(
      reportWrongFactHref(show, program, {
        kind: "github",
        repo: "CharlieNey/matinee",
      }),
    );
    expect(url.origin + url.pathname).toBe(
      "https://github.com/CharlieNey/matinee/issues/new",
    );
    expect(url.searchParams.get("title")).toContain("Chicago");
    expect(url.searchParams.get("body")).toContain("Key: chicago/");
    expect(reportOpensNewTab({ kind: "github", repo: "x/y" })).toBe(true);
  });

  it("can send it to a form that reads query parameters", () => {
    const url = new URL(
      reportWrongFactHref(show, program, {
        kind: "form",
        url: "https://tally.so/r/abc?ref=site",
      }),
    );
    expect(url.searchParams.get("ref")).toBe("site");
    expect(url.searchParams.get("subject")).toContain("Chicago");
    expect(url.searchParams.get("details")).toContain("Source: ");
  });
});

describe("checked dates", () => {
  it("formats a single date the same in every time zone", () => {
    expect(formatCheckedDate("2026-11-20")).toBe("Nov 20");
    expect(formatCheckedDate("2026-01-01")).toBe("Jan 1");
  });

  it("spells out the month for the header", () => {
    expect(formatCheckedLong("2026-11-20")).toBe("November 20");
    expect(formatCheckedLong("2026-12-01")).toBe("December 1");
  });
});
