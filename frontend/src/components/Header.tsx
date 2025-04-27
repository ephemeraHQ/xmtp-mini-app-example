import { env } from "@/lib/env";
import Image from "next/image";
import Link from "next/link";

// Constants for local storage keys
const XMTP_HAS_CONNECTED_KEY = "xmtp:hasConnected";
const XMTP_CONNECTION_TYPE_KEY = "xmtp:connectionType";
const XMTP_EPHEMERAL_KEY = "xmtp:ephemeralKey";

interface HeaderProps {
  onLogout?: () => void;
  isConnected?: boolean;
}

export function Header({ onLogout, isConnected }: HeaderProps) {
  // The logout handler that will be called when the button is clicked
  const handleLogout = async () => {
    if (!onLogout) return;
    
    try {
      // Call logout API to clear auth cookie
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include", // Important to include cookies
      });

      // Clear XMTP-related localStorage items
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
      
      // Clear local storage and cookies
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear cookies
      document.cookie.split(";").forEach(function (c) {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      
      // Call the onLogout function passed from parent component
      onLogout();
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };
  
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
      <Link href="/" className="flex items-center gap-2">
       
        <span className="text-white font-medium">xmtp mini-app examples</span>
      </Link>
      
      {isConnected && onLogout && (
        <button 
          onClick={handleLogout}
          className="text-sm text-red-400 hover:text-red-300 transition-colors px-3 py-1 rounded-md bg-gray-900"
        >
          Logout
        </button>
      )}
    </header>
  );
} 