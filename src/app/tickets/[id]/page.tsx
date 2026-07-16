import { TicketDetails } from "@/components/TicketDetails";
import { marketplaceListings, soldListings } from "@/lib/data";

export function generateStaticParams() {
  return [...marketplaceListings, ...soldListings].map((listing) => ({
    id: listing.id,
  }));
}

export default async function TicketDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TicketDetails id={id} />;
}
