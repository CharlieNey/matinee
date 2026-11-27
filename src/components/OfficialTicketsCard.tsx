import { ExternalLink } from "lucide-react";
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
      data-seller-link="official-tickets"
      data-show={show.slug}
      data-platform={ticketLink.provider}
      className="flex items-center gap-3 border-t border-line py-4 transition-opacity duration-150 active:opacity-60"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-body text-ink">
          Full price on{" "}
          <b className="font-semibold">{ticketLink.provider}</b>
        </span>
        <span className="mt-0.5 block text-caption text-ink-soft">
          ${show.faceValue} face
          {allIn ? ` · ${allInLabel(allIn)}` : ""}
        </span>
      </span>
      <ExternalLink
        className="size-4 shrink-0 text-ink-soft"
        strokeWidth={1.8}
        aria-hidden="true"
      />
      <span className="sr-only">Opens in a new tab</span>
    </a>
  );
}
