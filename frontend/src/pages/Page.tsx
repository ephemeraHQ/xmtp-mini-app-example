"use client";

import { useEffect, useState } from "react";
import { FullPageLoader } from "@/components/FullPageLoader";
import { Header } from "@/components/Header";
import { SafeAreaContainer } from "@/components/SafeAreaContainer";
import MemberRenderer from "@/components/MemberRenderer";

export default function Page() {
  const [mounted, setMounted] = useState(false);

  // Mark as mounted on client-side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Show loader while not mounted
  if (!mounted) {
    return (
      <SafeAreaContainer>
        <div className="flex flex-col w-full max-w-md mx-auto h-screen bg-black">
          <FullPageLoader />
        </div>
      </SafeAreaContainer>
    );
  }

  return (
    <SafeAreaContainer>
      <div className="flex flex-col w-full max-w-md mx-auto h-screen bg-black">
        <Header isConnected={false} />

        <div className="flex flex-col gap-4 px-4 py-4 h-full overflow-auto">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-white mb-2">
              Group Members
            </h1>
            <p className="text-gray-400 text-sm">
              View group member addresses passed via URL parameters
            </p>
          </div>

          <MemberRenderer />
        </div>
      </div>
    </SafeAreaContainer>
  );
}
