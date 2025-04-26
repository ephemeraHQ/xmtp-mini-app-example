import "./globals.css";
import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { headers } from "next/headers";
import { Providers } from "@/providers";
import "./config"; // Import global config to disable caching

const montserrat = Montserrat({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "XMTP MiniApp",
  description: "XMTP MiniApp",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  ),
  other: {
    "Cache-Control":
      "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
    Pragma: "no-cache",
    Expires: "0",
  },
};

export const revalidate = 0;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookies = headers().get("cookie");

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${montserrat.className} size-full antialiased max-h-screen overflow-y-hidden`}>
        <Providers cookies={cookies}>{children}</Providers>
      </body>
    </html>
  );
}
