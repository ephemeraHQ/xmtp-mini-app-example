"use client";

import dynamic from "next/dynamic";
import { FrameProvider } from "@/context/frame-context";
import { XMTPProvider } from "@/context/xmtp-context";
import MiniAppWalletProvider from "@/providers/miniapp-wallet-provider";

const ErudaProvider = dynamic(
  () => import("@/providers/eruda").then((c) => c.ErudaProvider),
  {
    ssr: false,
  },
);

export const Providers = ({
  children,
  cookies,
}: {
  children: React.ReactNode;
  cookies: string | null;
}) => {
  return (
    <ErudaProvider>
      <FrameProvider>
        <MiniAppWalletProvider cookies={cookies}>
          <XMTPProvider>{children}</XMTPProvider>
        </MiniAppWalletProvider>
      </FrameProvider>
    </ErudaProvider>
  );
};
