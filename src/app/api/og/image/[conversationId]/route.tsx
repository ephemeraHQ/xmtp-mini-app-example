/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { OG_IMAGE_SIZE } from "@/lib/constants";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(
  _: Request,
  {
    params,
  }: {
    params: Promise<{
      conversationId: string;
    }>;
  },
) {
  try {
    // for example you can get the conversation details from the conversationId
    const { conversationId } = await params;

    const defaultResponse = new ImageResponse(<DefaultImage />, {
      ...OG_IMAGE_SIZE,
      debug: false,
      headers: [
        ["Cache-Control", "public, s-maxage=3600, stale-while-revalidate=59"], // cache in CDN for 1 hour, serve cache while revalidating
      ],
    });

    return defaultResponse;
  } catch (e: any) {
    console.log(`Error generating ${e.message}`);
    return new ImageResponse(<DefaultImage />, {
      ...OG_IMAGE_SIZE,
      debug: false,
      headers: [
        ["Cache-Control", "public, s-maxage=3600, stale-while-revalidate=59"], // cache in CDN for 1 hour, serve cache while revalidating
      ],
    });
  }
}

const DefaultImage = () => (
  <img
    src={`${env.NEXT_PUBLIC_URL}/frame-default-image.png`}
    alt="Default image for frames"
    width={"600px"}
    height={"400px"}
  />
);
