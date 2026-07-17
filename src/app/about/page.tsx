import Link from "next/link";
import { BackHeader } from "@/components/BackHeader";
import { allPrograms } from "@/lib/programs";
import { allTheaters } from "@/lib/theaters";

export const metadata = {
  title: "About",
  description:
    "How this works: hand-curated Broadway rush & lottery data, and why there's no scraper behind it.",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="group mt-9 first:mt-0">
      <div className="rule-double mb-7 group-first:hidden" aria-hidden />
      <h2 className="text-heading">{title}</h2>
      <div className="mt-3 flex flex-col gap-3 text-body text-ink-soft">
        {children}
      </div>
    </section>
  );
}

function Endpoint({ path }: { path: string }) {
  return (
    <a
      href={path}
      className="flex h-12 items-center rounded-full bg-inset px-4 font-mono text-[15px] text-ink transition-transform duration-150 active:scale-[0.98]"
    >
      GET {path}
    </a>
  );
}

export default function AboutPage() {
  const programCount = allPrograms().length;
  const houseCount = allTheaters().length;

  return (
    <main className="px-4 pb-12 web:mx-auto web:max-w-[640px]">
      <BackHeader title="About Matinee" />

      <div className="mt-4">
        <Section title="The cheap seats exist. The interface doesn't.">
          <p>
            Broadway just closed a record season — $1.91 billion in grosses,
            an average paid admission around $131, celebrity plays running
            $300–900 a seat. In the same season,{" "}
            <b className="font-semibold text-ink">
              30 of 32 shows ran an official program that gets you in for
              under $50
            </b>
            : digital lotteries, box-office rush, standing room.
          </p>
          <p>
            The catch is the interface. Those programs live on four or five
            separate platforms, open and close at odd hours, and the
            community&apos;s best tool is a volunteer-run static page whose
            own disclaimer says it can&apos;t guarantee freshness. Even
            TodayTix&apos;s official advice is to &quot;note what time Rush
            opens, set an alert&quot; — yourself. This app is that alert, plus
            the map, plus the board.
          </p>
        </Section>

        <Section title="Why the data is curated by hand">
          <p>
            There is no API for any of this. We checked properly — the
            research is in the repo (RESEARCH.md). Every rush and lottery
            program here ({programCount} of them) and every Broadway house
            ({houseCount}) was entered by hand from the platforms&apos; own
            pages and the standard editorial roundups — the same way the
            incumbents actually maintain their data.
          </p>
          <p>
            That&apos;s a feature, not a fallback: the dataset is small,
            slow-moving, and legible. Every row carries a{" "}
            <b className="font-semibold text-ink">lastVerified</b> date, and
            anything older than about two weeks renders as unverified in the
            UI rather than pretending to be fresh.
          </p>
        </Section>

        <Section title="Who actually sells Broadway tickets">
          <p>
            No single seller covers Broadway. Ticketing follows theater
            ownership: the Shubert houses sell through Telecharge, the
            Nederlander and Disney houses through Broadway Direct, the ATG
            houses through ATG Tickets, and the nonprofits through their own
            box offices. That split is the most quietly confusing fact in
            Broadway ticket-buying, and it&apos;s why{" "}
            <Link
              href="/district"
              className="font-semibold text-ink underline underline-offset-2"
            >
              the District map
            </Link>{" "}
            colors every house by who sells it.
          </p>
        </Section>

        <Section title="What we deliberately didn't build">
          <p>
            Judgment is most visible in the rejections, so here they are:
          </p>
          <p>
            <b className="font-semibold text-ink">No scraping.</b>{" "}
            Ticketmaster&apos;s terms prohibit automated retrieval outright,
            and courts have entertained the copyright theory behind that.
            SeatGeek sits behind bot protection. A product built on scraping
            these is a product built on sand.
          </p>
          <p>
            <b className="font-semibold text-ink">
              No lottery-entry automation.
            </b>{" "}
            Every known bot drives a real browser or a phone emulator with
            someone&apos;s personal login, and every one we studied rotted
            within weeks. We link you to the entry page at the right moment
            instead; you enter yourself.
          </p>
          <p>
            <b className="font-semibold text-ink">No resale APIs.</b>{" "}
            StubHub&apos;s and TodayTix&apos;s APIs are partner-only, and
            SeatGeek&apos;s terms forbid showing other sellers&apos; listings
            beside its data. Purchases here always deep-link out to the
            official seller — we are the index, never the checkout.
          </p>
          <p>
            <b className="font-semibold text-ink">
              No marketplace, in the end.
            </b>{" "}
            This app began as a study of a peer-to-peer ticket marketplace,
            and for a while it carried a working replica. We retired it: a
            demo marketplace can only ever be theater about theater — fake
            listings, fake sales — while everything else here runs on real,
            verifiable data. The app the reference marketplace still deserves
            credit for is named below.
          </p>
        </Section>

        <Section title="Open data">
          <p>
            The datasets are the spine of this product, so they&apos;re
            published — stamped, structured, and free to build on:
          </p>
          <Endpoint path="/api/programs.json" />
          <Endpoint path="/api/theaters.json" />
          <p className="text-caption text-ink-faint">
            All times America/New_York. Verify with the linked platform
            before you plan a night around a row.
          </p>
        </Section>

        <Section title="Sources & credits">
          <p>
            <b className="font-semibold text-ink">Wikidata.</b> Each house
            carries cross-reference IDs (Wikidata → IBDB and Playbill) seeded
            from Wikidata&apos;s CC0 data — then audited by hand, because the
            seed has real errors: Wikidata lists the Gershwin at 15,408
            seats. It has about 1,933. That one number is the whole argument
            for hand-curation.
          </p>
          <p>
            <b className="font-semibold text-ink">TDF.</b> The live TKTS
            board comes from TDF&apos;s public TKTS Live page, and always
            renders with TDF&apos;s own &quot;updated&quot; stamp — never our
            fetch time. When their board is stale, ours says so.
          </p>
        </Section>

        <Section title="Colophon">
          <p>
            Built with Next.js, React, Tailwind, and Motion. The design
            language is reverse-engineered from screenshots of the Theatr iOS
            app and documented in DESIGN.md; the phased build lives in
            PLAN.md. This is a personal portfolio experiment — it is not
            affiliated with Theatr, the ticketing platforms, or any theater
            owner, and poster art belongs to its productions.
          </p>
        </Section>
      </div>
    </main>
  );
}
