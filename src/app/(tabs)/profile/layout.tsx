import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your theater diary",
  description:
    "Your Matinee activity, rush and lottery record, and theater collection.",
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
