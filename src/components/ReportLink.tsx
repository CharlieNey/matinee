import type { ReactNode } from "react";
import { reportOpensNewTab, reportWrongFactHref } from "@/lib/contact";
import type { Program } from "@/lib/programs";
import type { Show } from "@/lib/shows";

/**
 * "Report a wrong fact": one tap to a report prefilled with the row's
 * details. Where it lands is REPORT_TO in lib/contact.ts.
 */
export function ReportLink({
  show,
  program,
  children,
}: {
  show: Show;
  program?: Program;
  children: ReactNode;
}) {
  const newTab = reportOpensNewTab();
  return (
    <a
      href={reportWrongFactHref(show, program)}
      target={newTab ? "_blank" : undefined}
      rel={newTab ? "noreferrer" : undefined}
      data-report-link
      className="underline underline-offset-2 transition-opacity active:opacity-60"
    >
      {children}
    </a>
  );
}
