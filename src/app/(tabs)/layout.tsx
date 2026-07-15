import { TabBar } from "@/components/TabBar";

export default function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="pb-36">{children}</div>
      <TabBar />
    </>
  );
}
