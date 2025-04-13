import ky from "ky";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET() {
  try {
    const data = await ky
      .get(`${env.BACKEND_URL}/api/xmtp/get-group-id`, {
        headers: {
          "x-api-secret": env.API_SECRET_KEY,
        },
      })
      .json();
    console.log("data", data);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching group ID:", (error as Error).message);
    return NextResponse.json(
      { error: "Failed to fetch group ID" },
      { status: 500 },
    );
  }
}
