import { BackHeader } from "@/components/BackHeader";
import { TripPlanner } from "@/components/TripPlanner";

export const metadata = {
  title: "Trip mode",
  description:
    "A short, personalized rush and lottery plan for your Broadway trip, with every window available when you need it.",
};

export default function TripPage() {
  return (
    <main className="pb-10 web:mx-auto web:max-w-[860px]">
      <BackHeader title="Trip mode" />
      <div className="px-4">
        <TripPlanner />
      </div>
    </main>
  );
}
