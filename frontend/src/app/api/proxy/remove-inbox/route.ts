import ky from "ky";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";

// Input validation schema
const removeChatSchema = z.object({
  inboxId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const removeChatResult = removeChatSchema.safeParse(body);
    if (!removeChatResult.success) {
      return NextResponse.json({ error: "Invalid inbox ID" }, { status: 400 });
    }

    const { inboxId } = removeChatResult.data;
    console.log("Removing inbox:", inboxId);
    const data = await ky
      .post(`${env.BACKEND_URL}/api/xmtp/remove-inbox`, {
        json: { inboxId },
        headers: {
          "x-api-secret": env.API_SECRET_KEY,
        },
        timeout: 10000,
      })
      .json();
    console.log(`Remove inbox response received 2`, data);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error adding inbox:", (error as Error).message);
    return NextResponse.json({ error: "Failed to add inbox" }, { status: 500 });
  }
}
