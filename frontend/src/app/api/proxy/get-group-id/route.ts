import ky from "ky";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { GroupData } from "@/types/xmtp";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Get inboxId from URL parameters
    const { searchParams } = new URL(request.url);
    const inboxId = searchParams.get("inboxId");

    if (!inboxId) {
      return NextResponse.json(
        { error: "inboxId is required" },
        { status: 400 },
      );
    }

    const requestUrl = `${env.BACKEND_URL}/api/xmtp/get-group-id?inboxId=${inboxId}`;
    console.log(`Requesting group data from backend: ${requestUrl}`);

    try {
      const data = await ky
        .get(requestUrl, {
          headers: {
            "x-api-secret": env.API_SECRET_KEY,
          },
          timeout: 10000, // 10s timeout
          cache: "no-store", // Disable caching
          retry: 0, // Disable retries to prevent spamming the backend
        })
        .json<GroupData>();

      // Log the raw response for debugging
      console.log(`Backend response received`, data.groupId);
      return NextResponse.json(data);
    } catch (fetchError) {
      console.error("Error communicating with backend");
      return NextResponse.json(
        { error: "Backend service unavailable" },
        { status: 503 },
      );
    }
  } catch (error) {
    console.error("Error in get-group-id proxy:", (error as Error).message);
    return NextResponse.json(
      { error: "Failed to fetch group ID" },
      { status: 500 },
    );
  }
}
