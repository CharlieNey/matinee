import { BackHeader } from "@/components/BackHeader";
import { DistrictMap } from "@/components/DistrictMap";
import { allTheaters, theatersLastVerified } from "@/lib/theaters";

export default function DistrictPage() {
  const houseCount = allTheaters().length;

  return (
    <main className="pb-10 web:mx-auto web:max-w-[860px]">
      <BackHeader title="The District" />
      <div className="px-4">
        <p className="mt-2 text-body text-ink-soft">
          Every Broadway house, who actually sells its tickets, and which
          entry windows are open — right now. Tap a theater.
        </p>
        <p className="mt-2 text-caption text-ink-faint">
          {houseCount} houses · hand-drawn, hand-curated · verified{" "}
          {new Date(`${theatersLastVerified()}T12:00:00`).toLocaleDateString(
            "en-US",
            { month: "long", day: "numeric" },
          )}
        </p>
        <div className="mt-5">
          <DistrictMap />
        </div>
      </div>
    </main>
  );
}
