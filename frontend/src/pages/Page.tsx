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
  const [activeExample, setActiveExample] = useState<"group" | "bot">("group");

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
                {/* Example Selector */}
                <div className="w-full bg-gray-900 p-3 rounded-md">
                  <h2 className="text-white text-sm font-medium mb-2">Examples</h2>
                  <div className="flex gap-2">
                    <button
                      className={`px-3 py-1 text-xs rounded-md ${
                        activeExample === "group" 
                          ? "bg-blue-600 text-white" 
                          : "bg-gray-800 text-gray-300"
                      }`}
                      onClick={() => setActiveExample("group")}
                    >
                      Group Chat
                    </button>
                    <button
                      className={`px-3 py-1 text-xs rounded-md ${
                        activeExample === "bot" 
                          ? "bg-blue-600 text-white" 
                          : "bg-gray-800 text-gray-300"
                      }`}
                      onClick={() => setActiveExample("bot")}
                    >
                      Bot Chat
                    </button>
                  </div>
                </div>
                
                {/* Display the selected example */}
                {activeExample === "group" ? (
                  <GroupChat />
                ) : (
                  <BotChat />
                )}
              </>
            )}
          </div>
        )}
      </div>
    </SafeAreaContainer>
  );
}