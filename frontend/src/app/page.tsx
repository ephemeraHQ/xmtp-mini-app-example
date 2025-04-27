import { Metadata } from "next";
import dynamic from "next/dynamic";
import { OG_IMAGE_SIZE } from "@/lib/constants";
import { env } from "@/lib/env";
import "@/app/no-cache";

// Force dynamic rendering with no caching
export const dynamicParams = false;
export const runtime = "nodejs";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const HomePage = dynamic(() => import("@/components/pages/home"), {
  ssr: false,
});

/**
 * Default Next.js function to generate metadata for the page
 * https://nextjs.org/docs/app/api-reference/functions/generate-metadata
 * @returns metadata object
 */
export async function generateMetadata(): Promise<Metadata> {
  const ogTitle = "XMTP Group Chat";
  const ogDescription = "Join the group chat on Farcaster with XMTP 💬";
  const ogImageUrl = `${env.NEXT_PUBLIC_URL}/images/frame-default-image.png`;

  return {
    title: ogTitle,
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      type: "website",
      images: [
        {
          url: ogImageUrl,
          width: OG_IMAGE_SIZE.width,
          height: OG_IMAGE_SIZE.height,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      creator: "@xmtp_",
      siteId: "1382634722719858690",
      creatorId: "1382634722719858690",
      images: [ogImageUrl],
    },
  };
}

export default function Home() {
  return <HomePage />;
}
