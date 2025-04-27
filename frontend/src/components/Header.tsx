import { env } from "@/lib/env";
import Image from "next/image";
import Link from "next/link";

interface HeaderProps {
  onLogout?: () => void;
  isConnected?: boolean;
}

export function Header({ onLogout, isConnected }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
      <Link href="/" className="flex items-center gap-2">
       
        <span className="text-white font-medium">XMTP Debugger</span>
      </Link>
      
      {isConnected && onLogout && (
        <button 
          onClick={onLogout}
          className="text-sm text-red-400 hover:text-red-300 transition-colors px-3 py-1 rounded-md bg-gray-900"
        >
          Logout
        </button>
      )}
    </header>
  );
} 