import { BackHeader } from "@/components/BackHeader";
import { WrappedScreen } from "@/components/WrappedScreen";

export const metadata = {
  title: "Season Wrapped — Theatr",
  description: "Your year at the theater, as a shareable recap.",
};

export default function WrappedPage() {
  return (
    <main className="px-4 pb-10 web:mx-auto web:max-w-[560px]">
      <BackHeader title="Season Wrapped" />
      <WrappedScreen />
    </main>
  );
}
