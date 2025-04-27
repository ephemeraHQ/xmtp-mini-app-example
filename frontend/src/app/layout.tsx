import "./globals.css";
import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { headers } from "next/headers";
import { Providers } from "@/providers";
import "./config"; 
import { getPublicUrl } from "@/lib/env";
const montserrat = Montserrat({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "XMTP MiniApp",
  description: "XMTP MiniApp",
    metadataBase: new URL(
      getPublicUrl(),
  ),
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
