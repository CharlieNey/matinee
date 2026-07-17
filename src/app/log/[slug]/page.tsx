import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LogScreen } from "@/components/LogScreen";
import { allShows, getShow } from "@/lib/shows";

export function generateStaticParams() {
  return allShows().map((show) => ({ slug: show.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const show = getShow(slug);
  if (!show) return {};
  return {
    title: `Log ${show.title}`,
    description: `Add ${show.title} to your Matinee theater diary.`,
  };
}

export default async function LogPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const show = getShow(slug);
  if (!show) notFound();

  return <LogScreen show={show} />;
}
