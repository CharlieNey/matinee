import Link from "next/link";
import { TicketX } from "lucide-react";

export const metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-[430px] flex-col items-center justify-center px-8 text-center">
      <TicketX className="size-16 text-ink-faint" strokeWidth={1.4} />
      <h1 className="mt-5 text-title">That ticket went missing</h1>
      <p className="mt-2 text-body text-ink-soft">
        This page may have moved, but today&apos;s shows and entry windows are
        still on the board.
      </p>
      <Link
        href="/"
        className="mt-6 flex h-12 items-center justify-center rounded-full bg-vermilion px-6 text-body font-semibold text-white transition-transform duration-150 active:scale-[0.98]"
      >
        Back to Discover
      </Link>
    </main>
  );
}
