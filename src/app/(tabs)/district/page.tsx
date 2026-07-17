import Link from "next/link";
import { BackHeader } from "@/components/BackHeader";
import { DistrictMap } from "@/components/DistrictMap";
import { allTheaters, theatersLastVerified } from "@/lib/theaters";

export const metadata = {
  title: "The District",
  description:
    "Every Broadway house on one hand-drawn map, with live entry windows.",
};

export default function DistrictPage() {
  const houseCount = allTheaters().length;

  return (
    <main className="pb-10 web:mx-auto web:max-w-[860px]">
      <BackHeader title="The District" />
      <div className="px-4">
        <p className="mt-2 text-caption text-ink-faint">
          {houseCount} houses · hand-drawn, hand-curated · verified{" "}
          {new Date(`${theatersLastVerified()}T12:00:00`).toLocaleDateString(
            "en-US",
            { month: "long", day: "numeric" },
          )}{" "}
          ·{" "}
          <Link href="/about" className="underline underline-offset-2">
            how this works
          </Link>
        </p>
        <div className="mt-5">
          <DistrictMap />
        </div>
      </div>
    </main>
  );
}
