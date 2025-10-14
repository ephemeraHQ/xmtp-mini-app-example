// This is a Server Component
import { Metadata } from "next";
import { OG_IMAGE_SIZE } from "@/lib/constants";
import { env } from "@/lib/env";
import { getFrameMetadata } from "@/lib/frame";
import Page from "@/pages/Page";

type Props = {
  params: Promise<{ conversationId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/**
 * Default Next.js function to generate metadata for the page
 * https://nextjs.org/docs/app/api-reference/functions/generate-metadata
 * @returns metadata object
 */
export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const _searchParams = await searchParams;
  const { conversationId } = _searchParams; // access to 123 in url example.org/?conversationId=123

  const ogTitle = "Group Member Renderer";
  const ogDescription = "View group member addresses via URL parameters";
  const ogImageUrl = `${env.NEXT_PUBLIC_URL}/frame-default-image.png`;

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
      images: [ogImageUrl],
    },
    other: {
      "fc:frame": JSON.stringify(getFrameMetadata(_searchParams)),
    },
  };
}

export default function Home() {
  return <Page />;
}
