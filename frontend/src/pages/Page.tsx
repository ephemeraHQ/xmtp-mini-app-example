"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { SafeAreaContainer } from "@/components/SafeAreaContainer";
import { FullPageLoader } from "@/components/FullPageLoader";
import { useXMTP } from "@/context/xmtp-context";
import ConnectionInfo from "@/examples/ConnectionInfo";
import WalletConnection from "@/examples/WalletConnection";
import GroupManagement from "@/examples/GroupManagement";

// Force dynamic rendering with no caching
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function ExamplePage() {
  const { client, initializing, disconnect } = useXMTP();
  const [isConnected, setIsConnected] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showLoader, setShowLoader] = useState(true);

  // Only run client-side code after mount
  useEffect(() => {
    setMounted(true);
    
    // Add a safety timeout to prevent UI from being stuck in loading state
    const timeoutId = setTimeout(() => {
      setShowLoader(false);
    }, 20000); // 20 seconds max loading time
    
    return () => clearTimeout(timeoutId);
  }, []);
  
  // Update loader state based on initializing state
  useEffect(() => {
    if (!initializing) {
      setShowLoader(false);
    } else {
      setShowLoader(true);
    }
  }, [initializing]);

  // Handle logout through the header
  const handleLogout = () => {
    if (client) {
      disconnect();
      window.location.href = window.location.origin; // Redirect to home after logout
    }
  };

  // If not mounted yet, render loading
  if (!mounted) {
    return (
      <SafeAreaContainer>
        <div className="flex flex-col gap-0 pb-1 w-full max-w-md mx-auto h-screen bg-black transition-all duration-300">
          <FullPageLoader />
        </div>
      </SafeAreaContainer>
    );
  }

  return (
    <SafeAreaContainer>
      <div className="flex flex-col gap-0 pb-1 w-full max-w-md mx-auto h-screen bg-black transition-all duration-300">
        <Header 
          isConnected={isConnected || !!client} 
          onLogout={isConnected || !!client ? handleLogout : undefined} 
        />
        {showLoader ? (
          <FullPageLoader />
        ) : (
          <div className="flex flex-col gap-4 px-4 py-4 h-full overflow-auto">
            {/* Connection Info Example */}
            <ConnectionInfo onConnectionChange={setIsConnected} />
            
            {/* Wallet Connection Example (show only when not connected) */}
            {!client && (
              <WalletConnection />
            )}
            
            {/* Group Management (show when connected) */}
            {client && (
              <GroupManagement />
            )}
            
          </div>
        )}
      </div>
    </SafeAreaContainer>
  );
} 