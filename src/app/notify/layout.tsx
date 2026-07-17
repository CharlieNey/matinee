import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Following",
  description:
    "Manage deadline alerts for the Broadway rush and lottery programs you follow.",
};

export default function FollowingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
