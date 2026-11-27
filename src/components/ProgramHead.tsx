import type { ReactNode } from "react";

/**
 * The printed program's section break, used on every page: a serif italic
 * head over a strong rule, with an optional count or note on the right. It
 * replaces the spaced-capital labels (and the card-app look) of the first
 * design.
 */
export function ProgramHead({
  title,
  detail,
  as: Tag = "h2",
  className = "",
}: {
  title: ReactNode;
  detail?: ReactNode;
  as?: "h2" | "h3";
  className?: string;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 border-b-2 border-ink pb-2 ${className}`}
    >
      <Tag className="font-display text-[26px] font-bold leading-none">{title}</Tag>
      {detail !== undefined && (
        <span className="shrink-0 text-caption text-ink-soft">{detail}</span>
      )}
    </div>
  );
}
