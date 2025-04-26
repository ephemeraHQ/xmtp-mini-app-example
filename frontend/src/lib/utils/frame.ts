import ky from "ky";
import { env } from "@/lib/env";

/**
 * Get the fonts for the frame from the public folder
 * @returns The fonts for the frame
 */
export async function getFonts(): Promise<
  {
    name: string;
    data: ArrayBuffer;
    weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
    style: "normal" | "italic";
  }[]
> {
  // Use Google Fonts for Inter font
  const [font, fontBold] = await Promise.all([
    fetch("https://fonts.googleapis.com/css2?family=Inter&display=swap").then(
      (res) => res.arrayBuffer(),
    ),
    fetch(
      "https://fonts.googleapis.com/css2?family=Inter:wght@700&display=swap",
    ).then((res) => res.arrayBuffer()),
  ]);

  return [
    {
      name: "Inter",
      data: font,
      weight: 400 as const,
      style: "normal" as const,
    },
    {
      name: "Inter",
      data: fontBold,
      weight: 700 as const,
      style: "normal" as const,
    },
  ];
}

/**
 * Get the farcaster manifest for the frame, generate yours from Warpcast Mobile
 *  On your phone to Settings > Developer > Domains > insert website hostname > Generate domain manifest
 * @returns The farcaster manifest for the frame
 */
export async function getFarcasterManifest() {
  let accountAssociation = {
    header:
      "eyJmaWQiOjEwOTUyLCJ0eXBlIjoiY3VzdG9keSIsImtleSI6IjB4OTI5Mjk3RGVGZDJBN2IzMzk0QTEyNkMwMDUxMkY2NjUxMzQ1YTE4ZiJ9",
    payload: "eyJkb21haW4iOiJ4bXRwLW1pbmktYXBwLnZlcmNlbC5hcHAifQ",
    signature:
      "MHhkMmZkNTgxOWRiZWNhZjk4ZDUxZTNkOTBiNjI0NTMxNmRhYjA3MzNkM2M5MmZjNjRkMGYwZDc0ZGVlNmQ3ZmU3NmFkNTM0ZDEzOGM0NTRiNDJlMWE2MzFiNzhhOGQzNWRiZmRjODEzZmQ5NjYzMWFkZDQ3NDVkZjY1NzJiMDYzNDFi",
  };
  if (env.NEXT_PUBLIC_APP_ENV !== "production") {
    accountAssociation = {
      header:
        "eyJmaWQiOjE4OTYzNiwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweGMwODNEYjQxNThkNzdDMWNDYjIxMkI5MUQ3MWMwZmEzODcyMTc4YzEifQ",
      payload: "eyJkb21haW4iOiJsb2NhbGhvc3Q6MzAwMCJ9",
      signature:
        "MHg3ZjQzZjIyNTM0NjkxZGZlZjAyYTk3MTMyM2VkMWZhOTI4NjJlZDg4YTg5NzY0OTZlMzY5NWZjNzdlOTc1NDMxMjVmYWZiNzc2ZWMwOTdiMmU1ODcwZmNmNWIxYjc3ZmZmMjYwOWVkYTVkNGIwYjM4MjYwMTk3ZThjZThiYjUzOTFj",
    };
  }
  return {
    accountAssociation,
    frame: {
      version: "1",
      name: "XMTP MiniApp",
      iconUrl: `${env.NEXT_PUBLIC_URL}/images/icon.png`,
      homeUrl: env.NEXT_PUBLIC_URL,
      imageUrl: `${env.NEXT_PUBLIC_URL}/images/frame-default-image.png`,
      buttonTitle: "Launch XMTP MiniApp",
      splashImageUrl: `${env.NEXT_PUBLIC_URL}/images/splash.png`,
      splashBackgroundColor: "#0d0d0d",
      webhookUrl: `${env.NEXT_PUBLIC_URL}/api/webhook/farcaster`,
    },
  };
}
