import { BackHeader } from "@/components/BackHeader";
import { TripPlanner } from "@/components/TripPlanner";

export const metadata = {
  title: "Trip mode — Theatr",
  description:
    "In town for a few days? A day-by-day plan of every rush and lottery window during your visit.",
};

export default function TripPage() {
  return (
    <main className="pb-10 web:mx-auto web:max-w-[860px]">
      <BackHeader title="Trip mode" />
      <div className="px-4">
        <p className="mt-2 text-body text-ink-soft">
          In town for a few days? Here&apos;s every entry window during your
          visit, day by day — enter tonight for tomorrow&apos;s shows.
        </p>
        <TripPlanner />
      </div>
    </main>
  );
}
