import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shared theater diary",
  description: "A theater diary shared privately through a Matinee link.",
};

export default function SharedProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
