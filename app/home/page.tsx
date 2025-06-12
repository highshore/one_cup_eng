import HomePageClient from "../lib/features/home/components/HomePageClient";
import { fetchUpcomingMeetupEventsServer } from "../lib/features/meetup/services/meetup_service_server";
import { MeetupEvent } from "../lib/features/meetup/types/meetup_types";

// This page will be statically generated at build time
export default async function HomePage() {
  let upcomingEvents: MeetupEvent[] = [];

  try {
    // Fetch upcoming meetup events at build time (SSG)
    upcomingEvents = await fetchUpcomingMeetupEventsServer();
  } catch (error) {
    console.error("Error fetching upcoming events at build time:", error);
    // Fall back to empty array - client will handle fetching
    upcomingEvents = [];
  }

  return <HomePageClient initialUpcomingEvents={upcomingEvents} />;
}

// Generate metadata for SEO
export async function generateMetadata() {
  return {
    title: "영어 한잔 | 실전 영어 학습 플랫폼",
    description:
      "매주 영어 모임으로 실전 회화 연습하고, 매일 영어 아티클로 어휘력을 늘려보세요.",
    keywords:
      "영어 학습, 영어 회화, 영어 모임, 영어 뉴스, 영어 공부, 영어 한잔",
    openGraph: {
      title: "영어 한잔 | 실전 영어 학습 플랫폼",
      description:
        "매주 영어 모임으로 실전 회화 연습하고, 매일 영어 아티클로 어휘력을 늘려보세요.",
      type: "website",
      url: "https://one-cup-eng.web.app",
      images: [
        {
          url: "/images/logos/1cup_logo.jpg",
          width: 1200,
          height: 630,
          alt: "영어 한잔 로고",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "영어 한잔 | 실전 영어 학습 플랫폼",
      description:
        "매주 영어 모임으로 실전 회화 연습하고, 매일 영어 아티클로 어휘력을 늘려보세요.",
      images: ["/images/logos/1cup_logo.jpg"],
    },
  };
}
