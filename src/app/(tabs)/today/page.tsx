import { TodayEntries } from "@/components/TodayEntries";

export const metadata = {
  title: "Enter today's lotteries",
  description:
    "Every Broadway lottery and rush open now or opening later today, each linked to its official entry page.",
  alternates: { canonical: "/today" },
};

export default function TodayPage() {
  return (
    <main className="px-4 pb-6 pt-6 web:mx-auto web:max-w-[720px] web:px-6">
      <h1 className="text-display">Enter today&apos;s lotteries</h1>
      <p className="mt-3 text-body text-ink-soft">
        Every lottery and rush you can still enter today, linked to its official
        page. Tick each one once you&apos;ve entered: the ticks stay on this
        device and clear at midnight. Matinee never enters for you.
      </p>
      <TodayEntries />
    </main>
  );
}
