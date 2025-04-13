import ky from "ky";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";

// Input validation schema
const joinChatSchema = z.object({
  inboxId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { inboxId } = joinChatSchema.parse(body);

    const data = await ky
      .post(`${env.BACKEND_URL}/api/xmtp/remove-inbox`, {
        json: { inboxId },
        headers: {
          "x-api-secret": env.API_SECRET_KEY,
        },
      })
      .json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error adding inbox:", (error as Error).message);
    return NextResponse.json({ error: "Failed to add inbox" }, { status: 500 });
  }
}
