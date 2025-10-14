"use client";

import { useEffect, useState } from "react";
import { FullPageLoader } from "@/components/FullPageLoader";
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
    
        <div className="flex flex-col gap-4 px-4 py-4 h-full overflow-auto">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-white mb-2">
              Tagged members
            </h3>
            <p className="text-gray-400 text-sm">
              Resolving member identities from tags (ENS, Farcaster, addresses)
            </p>
          </div>

          <MemberRenderer />
        </div>
      </div>
    </SafeAreaContainer>
  );
}
