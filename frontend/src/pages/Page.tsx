"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { SafeAreaContainer } from "@/components/SafeAreaContainer";
import { FullPageLoader } from "@/components/FullPageLoader";
import { useXMTP } from "@/context/xmtp-context";
import ConnectionInfo from "@/examples/ConnectionInfo";
import WalletConnection from "@/examples/WalletConnection";
import GroupChat from "@/examples/GroupChat";
import BotChat from "@/examples/BotChat";

export default function ExamplePage() {
  const { client, initializing, disconnect } = useXMTP();
  const [isConnected, setIsConnected] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showLoader, setShowLoader] = useState(true);

  // Mark as mounted on client-side
  useEffect(() => {
    setMounted(true);
    
    // Add a safety timeout
    const timeoutId = setTimeout(() => {
      setShowLoader(false);
    }, 5000); // Reduced to 5 seconds for better UX
    
    return () => clearTimeout(timeoutId);
  }, []);
  
  // Update loader state based on initializing
  useEffect(() => {
    setShowLoader(initializing);
  }, [initializing]);

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
        <Header 
          isConnected={isConnected || !!client}  
        />
        
        {showLoader ? (
          <FullPageLoader />
        ) : (
          <div className="flex flex-col gap-4 px-4 py-4 h-full overflow-auto">
            <ConnectionInfo onConnectionChange={setIsConnected} />
            
            {!client && <WalletConnection />}
            
            {client && (
              <>
                <div className="w-full">
                  <GroupChat />
                </div>
                
                <div className="w-full mt-6">
                  <BotChat />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </SafeAreaContainer>
  );
}