import { BadgeCheck, ExternalLink, Ticket } from "lucide-react";
import { allInForProvider, allInLabel } from "@/lib/fees";
import { OfficialTicketLink } from "@/lib/officialTickets";
import { Show } from "@/lib/shows";

export function OfficialTicketsCard({
  show,
  ticketLink,
}: {
  show: Show;
  ticketLink: OfficialTicketLink;
}) {
  const allIn = allInForProvider(show.faceValue, ticketLink.provider);
  return (
    <a
      href={ticketLink.url}
      target="_blank"
      rel="noreferrer"
      className="mb-4 flex items-center gap-3 rounded-card bg-paper p-4 transition-transform duration-150 active:scale-[0.985]"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-sage text-sage-ink">
        <Ticket className="size-5" strokeWidth={1.9} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-caption font-semibold text-sage-ink">
          <BadgeCheck className="size-4" strokeWidth={2} aria-hidden="true" />
          Official tickets
        </span>
        <span className="mt-0.5 block truncate text-body font-semibold text-ink">
          Buy at {ticketLink.provider}
        </span>
        <span className="mt-0.5 block truncate text-caption text-ink-soft">
          Primary seller for {show.venue}
        </span>
        {allIn && (
          <span className="mt-0.5 block text-caption text-ink-soft">
            ${show.faceValue} face · {allInLabel(allIn)}
          </span>
        )}
      </span>
      <ExternalLink
        className="size-5 shrink-0 text-ink-soft"
        strokeWidth={1.8}
        aria-hidden="true"
      />
      <span className="sr-only">Opens in a new tab</span>
    </a>
  );
}
