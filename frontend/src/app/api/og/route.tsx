import { ImageResponse } from "@vercel/og";
import { DefaultImage } from "@/components/og/default-image";
import { OG_IMAGE_SIZE } from "@/lib/constants";
import { getFonts } from "@/lib/utils";

export async function GET() {
  try {
    const fonts = await getFonts();
    return new ImageResponse(<DefaultImage />, {
      ...OG_IMAGE_SIZE,
      fonts: fonts,
    });
  } catch (e: unknown) {
    console.error(`[api/og] Error generating image:`, (e as Error).message);
    // Fallback to a simpler response if fonts fail
    return new ImageResponse(<DefaultImage />, {
      ...OG_IMAGE_SIZE,
    });
  }
}
