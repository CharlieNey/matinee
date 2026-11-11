"use client";

import { useEffect } from "react";
import Link from "next/link";
import { reportClientError } from "@/lib/reportClientError";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => reportClientError(error), [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-[560px] flex-col items-center justify-center px-6 text-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="mt-3 text-display">The curtain came down early.</h1>
      <p className="mt-3 text-body text-ink-soft">
        The error was recorded. Try this page again, or return to Discover.
      </p>
      <div className="mt-7 flex gap-3">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="h-12 rounded-full bg-vermilion px-6 text-body font-semibold text-white"
        >
          Try again
        </button>
        <Link
          href="/"
          className="flex h-12 items-center rounded-full bg-paper px-6 text-body font-semibold"
        >
          Discover
        </Link>
      </div>
    </main>
  );
}
