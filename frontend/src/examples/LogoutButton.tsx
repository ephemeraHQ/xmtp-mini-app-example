"use client";

import { useState } from "react";
import { useDisconnect } from "wagmi";
import { Button } from "@/components/Button";
import { useXMTP } from "@/context/xmtp-context";
import { clearWagmiCookies } from "@/lib/wagmi";

// Constants for local storage keys
const XMTP_HAS_CONNECTED_KEY = "xmtp:hasConnected";
const XMTP_CONNECTION_TYPE_KEY = "xmtp:connectionType";
const XMTP_EPHEMERAL_KEY = "xmtp:ephemeralKey";

export default function LogoutButton() {
  const { disconnect: disconnectXmtp } = useXMTP();
  const { disconnect } = useDisconnect();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      setErrorMessage(null);

      // Call logout API to clear auth cookie
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include", // Important to include cookies
      });

      // First clear XMTP-related localStorage items
      localStorage.removeItem(XMTP_HAS_CONNECTED_KEY);
      localStorage.removeItem(XMTP_CONNECTION_TYPE_KEY);
      localStorage.removeItem(XMTP_EPHEMERAL_KEY);
      
      // Clear any XMTP-specific local storage items
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("xmtp.")) {
          localStorage.removeItem(key);
        }
      }
      
      // Clear remaining storage
      localStorage.clear();
      sessionStorage.clear();

      // Clear wagmi cookies specifically
      clearWagmiCookies();

      // Clear cookies
      document.cookie.split(";").forEach(function (c) {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

      // Disconnect from services
      disconnectXmtp();
      disconnect();

      // Redirect to home page
      window.location.href = window.location.origin;
    } catch (error) {
      console.error("Error logging out:", error);
      setErrorMessage("Failed to logout properly");
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-2">
      <Button 
        className="w-full" 
        size="default" 
        variant="destructive"
        disabled={isLoggingOut}
        onClick={handleLogout}
      >
        {isLoggingOut ? "Logging out..." : "Logout"}
      </Button>
      
      {errorMessage && (
        <div className="text-red-500 text-sm p-2 bg-red-900/20 rounded-md">
          {errorMessage}
        </div>
      )}
    </div>
  );
} 