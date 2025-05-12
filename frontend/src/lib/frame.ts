import { FrameContext } from "@farcaster/frame-core/dist/context";
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
  // Use Google Fonts directly
  const [font, fontBold] = await Promise.all([
    fetch(
      "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_0ew.woff",
    ).then((res) => res.arrayBuffer()),
    fetch(
      "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hjp-Ek-_0ew.woff",
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
 *  On your phone go to Settings > Developer > Domains > insert website hostname > Generate domain manifest
 *  Or on your browser go to https://warpcast.com/~/developers/mini-apps/manifest and insert your domain
 * @returns The farcaster manifest for the frame
 * @note This follows the Farcaster application configuration format: https://miniapps.farcaster.xyz/docs/guides/publishing#define-your-application-configuration
 * @note if you have issues with the manifest, check with the official farcaster schema: https://github.com/farcasterxyz/miniapps/blob/main/packages/frame-core/src/schemas/manifest.ts
 */
export async function getFarcasterManifest() {
  return {
    accountAssociation: {
      header: env.NEXT_PUBLIC_FARCASTER_HEADER,
      payload: env.NEXT_PUBLIC_FARCASTER_PAYLOAD,
      signature: env.NEXT_PUBLIC_FARCASTER_SIGNATURE,
    },
    frame: {
      version: "1", // required, must be '1'
      name: "XMTP MiniApp", // required, max length 32 char
      iconUrl: `${env.NEXT_PUBLIC_URL}/images/icon.png`, // required, https, png image 1024x1024 NO alpha, max length 1024 char
      homeUrl: env.NEXT_PUBLIC_URL, // required, https, max length 1024 char
      splashImageUrl: `${env.NEXT_PUBLIC_URL}/images/splash.png`, // https, image 200x200px, max length 32 char
      splashBackgroundColor: "#0d0d0d", // hex color in loading screen
      webhookUrl: `${env.NEXT_PUBLIC_URL}/api/webhook/farcaster`, // mandatory https POST endpoint, if the app uses notifications, max length 1024 char
      subtitle: "XMTP MiniApp", // max length 30 char, no emoji or special characters
      description: "XMTP MiniApp", // max length 170 char, no emoji or special characters
      // screenshotUrls: [], // https, portrait images 1284x2778px, max 3
      primaryCategory: "social", // games, social, finance, utility, productivity, utilities, health-fitness, news-media, music, shopping, education, developer-tools, entertainment, art-creativity
      tags: ["chat", "messaging", "e2e", "secure", "xmtp"], // max 5 tags of 20 char each, lowercase, no spaces, no emoji or special characters
      // heroImageUrl: "", // https, image 1200x630px, aspect ratio 1.91:1
      tagline: "XMTP MiniApp", // max length 30 char, no emoji or special characters
      ogTitle: "XMTP MiniApp", // max length 30 char, no emoji or special characters
      ogDescription: "XMTP MiniApp", // max length 100 char, no emoji or special characters
      // ogImageUrl: "", // https, image 1200x630px, aspect ratio 1.91:1
      noindex: false, // set to true to exclude from search results, useful for staging environments
    },
  };
}

/**
 * Get the frame metadata for the page
 * @param _params The parameters for the page
 * @returns The frame metadata for the page
 */
export const getFrameMetadata = (_params: {
  [key: string]: string | string[] | undefined;
}) => {
  const searchParamsString = Object.entries(_params)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const { conversationId } = _params;
  const buttonTitle = conversationId
    ? "Open Conversation in XMTP"
    : "Launch XMTP MiniApp";

  return {
    version: "next",
    imageUrl: `${env.NEXT_PUBLIC_URL}/images/frame-default-image.png`,
    button: {
      title: buttonTitle,
      action: {
        type: "launch_frame",
        name: "XMTP MiniApp",
        url: `${env.NEXT_PUBLIC_URL}/${searchParamsString ? `?${searchParamsString}` : ""}`,
        splashImageUrl: `${env.NEXT_PUBLIC_URL}/images/splash.png`,
        splashBackgroundColor: "#0d0d0d",
      },
    },
  };
};
