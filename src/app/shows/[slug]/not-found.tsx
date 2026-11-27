import Link from "next/link";
import { TicketX } from "lucide-react";

/** A show slug that isn't in the catalog: say so, and point at the board. */
export default function ShowNotFound() {
  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-[430px] flex-col items-center justify-center px-8 text-center">
      <TicketX className="size-16 text-ink-faint" strokeWidth={1.4} />
      <h1 className="mt-5 text-title">We don&apos;t list that show</h1>
      <p className="mt-2 text-body text-ink-soft">
        The link may be mistyped, or the show isn&apos;t one Matinee tracks.
        Every show we cover, with its rush and lottery windows, is on Discover.
      </p>
      <Link
        href="/"
        className="mt-6 flex h-12 items-center justify-center rounded-full bg-vermilion px-6 text-body font-semibold text-white transition-transform duration-150 active:scale-[0.98]"
      >
        Browse shows
      </Link>
    </main>
  );
}
