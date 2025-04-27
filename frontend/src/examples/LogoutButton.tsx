"use client";

import { useState } from "react";
import { useDisconnect } from "wagmi";
import { Button } from "@/components/Button";
import { useXMTP } from "@/context/xmtp-context";

// Key XMTP storage keys
const XMTP_KEYS = ["xmtp:hasConnected", "xmtp:connectionType", "xmtp:ephemeralKey"];

export default function LogoutButton() {
  const { disconnect: disconnectXmtp } = useXMTP();
  const { disconnect } = useDisconnect();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);

      // Clear API auth cookie
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      // Clear XMTP keys
      XMTP_KEYS.forEach(key => localStorage.removeItem(key));
      
      // Clear all XMTP prefixed items
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith("xmtp.")) {
          localStorage.removeItem(key);
        }
      });
      

      // Disconnect services
      disconnectXmtp();
      disconnect();

      // Redirect to home
      window.location.href = "/";
      
    } catch (error) {
      console.error("Logout error:", error);
      
      // Force redirect even if there's an error
      window.location.href = "/";
    }
  };

  return (
    <Button 
      className="w-full" 
      size="default" 
      variant="destructive"
      disabled={isLoggingOut}
      onClick={handleLogout}
    >
      {isLoggingOut ? "Logging out..." : "Logout"}
    </Button>
  );
}