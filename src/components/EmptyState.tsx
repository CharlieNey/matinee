"use client";

import type { ReactNode } from "react";
import Link from "next/link";

export function EmptyState({
  text = "Nothing here yet.",
  actionLabel,
  actionHref,
  onAction,
  icon,
}: {
  text?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  icon?: ReactNode;
}) {
  const actionClass =
    "text-body text-ink underline underline-offset-4 transition-opacity active:opacity-60";

  return (
    // A plain line and one way forward: no default icon, no ellipsis.
    <div className="flex flex-col items-center gap-3 px-8 py-10 text-center">
      {icon}
      <p className="max-w-[30ch] text-body leading-snug text-ink-soft">{text}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref} className={actionClass}>
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <button type="button" onClick={onAction} className={actionClass}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
