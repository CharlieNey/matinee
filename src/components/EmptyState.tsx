"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Ticket } from "lucide-react";

export function EmptyState({
  text = "Nothing here yet…",
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
    <div className="flex flex-col items-center gap-5 px-8 py-10 text-center">
      {icon ?? (
        <Ticket
          className="size-16 -rotate-[30deg] text-ink-faint"
          strokeWidth={1.4}
        />
      )}
      <p className="text-[20px] leading-snug text-ink-faint">{text}</p>
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
