import ky from "ky";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";

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

    const response = await ky.get(requestUrl, {
      headers: {
        "x-api-secret": env.API_SECRET_KEY,
      },
      timeout: 10000, // 10s timeout
      cache: "no-store", // Disable caching
    });

    // Log the raw response for debugging
    const rawResponseText = await response.clone().text();
    console.log("🔍 Raw response text:", rawResponseText);

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching group ID:", (error as Error).message);
    return NextResponse.json(
      { error: "Failed to fetch group ID" },
      { status: 500 },
    );
  }
}
