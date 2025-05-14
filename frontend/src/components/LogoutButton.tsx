"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDisconnect } from "wagmi";
import { Button } from "@/components/Button";
import { useXMTP } from "@/context/xmtp-context";
import { clearWagmiCookies } from "@/providers/miniapp-wallet-provider";

// Key XMTP storage keys
const XMTP_KEYS = [
  "xmtp:hasConnected",
  "xmtp:connectionType",
  "xmtp:ephemeralKey",
];

export default function LogoutButton() {
  const { disconnect: disconnectXmtp } = useXMTP();
  const { disconnect } = useDisconnect();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);

      // Clear API auth cookie
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      // Clear XMTP keys
      XMTP_KEYS.forEach((key) => localStorage.removeItem(key));

      // Clear all XMTP prefixed items
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("xmtp.")) {
          localStorage.removeItem(key);
        }
      });

      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();

      // Clear wagmi cookies
      clearWagmiCookies();

      // Disconnect services
      disconnectXmtp();
      disconnect();

      // Explicitly navigate to home page
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <Button
      className="text-sm text-red-400 hover:text-red-300 transition-colors px-2 py-0 rounded-md bg-gray-900"
      disabled={isLoggingOut}
      onClick={handleLogout}>
      {isLoggingOut ? "Logging out..." : "Logout"}
    </Button>
  );
}
