import { Suspense } from "react";
import { EventDetailClient } from "./EventDetailClient";

interface MeetupDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

// Generate static paths for meetup events
export async function generateStaticParams() {
  // For static export, return empty array since events are dynamic
  // The actual events will be loaded client-side
  return [];
}

export default function EventDetailPage({ params }: MeetupDetailPageProps) {
  return (
    <Suspense fallback={<div>Loading event details...</div>}>
      <EventDetailClient />
    </Suspense>
  );
}
