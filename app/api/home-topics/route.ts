import { NextResponse } from "next/server";
import { fetchHomeTopics } from "../../lib/features/home/services/topics_service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const topics = await fetchHomeTopics();
    return NextResponse.json(topics, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  } catch (error) {
    console.error("API: Failed to fetch home topics", error);
    return NextResponse.json(
      { error: "Failed to fetch home topics" },
      { status: 500 }
    );
  }
}
