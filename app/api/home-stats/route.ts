import { NextResponse } from "next/server";
import { fetchHomeStats } from "../../lib/features/home/services/stats_service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const stats = await fetchHomeStats();
    return NextResponse.json(stats, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  } catch (error) {
    console.error("API: Failed to fetch home stats", error);
    return NextResponse.json(
      { error: "Failed to fetch home stats" },
      { status: 500 }
    );
  }
}
