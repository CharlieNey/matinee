"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackHeader({ title }: { title?: string }) {
  const router = useRouter();

  return (
    <header className="relative flex h-14 items-center px-4">
      <button
        type="button"
        aria-label="Back"
        onClick={() => router.back()}
        className="-ml-2 flex size-11 items-center justify-center text-ink"
      >
        <ArrowLeft className="size-6" strokeWidth={2.2} />
      </button>
      {title && (
        <h1 className="absolute left-1/2 -translate-x-1/2 text-heading">
          {title}
        </h1>
      )}
    </header>
  );
}
