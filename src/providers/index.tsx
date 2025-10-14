"use client";

import dynamic from "next/dynamic";
import { FrameProvider } from "@/context/frame-context";

const ErudaProvider = dynamic(
  () => import("@/providers/eruda").then((c) => c.ErudaProvider),
  {
    ssr: false,
  },
);

export const Providers = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <ErudaProvider>
      <FrameProvider>
        {children}
      </FrameProvider>
    </ErudaProvider>
  );
};
