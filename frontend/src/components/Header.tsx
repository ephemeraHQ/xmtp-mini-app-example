import Link from "next/link";
import { env } from "@/lib/env";
import { useEruda } from "@/providers/eruda";
import LogoutButton from "./LogoutButton";

interface HeaderProps {
  onLogout?: () => void;
  isConnected?: boolean;
}

export function Header({ onLogout, isConnected }: HeaderProps) {
  // Use the Eruda context to access toggle functionality
  const { isVisible, toggleEruda } = useEruda();

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
      <Link href="/" className="flex items-center gap-2">
        <span className="text-white font-medium">xmtp-mini-app-examples</span>
      </Link>

      <div className="flex items-center space-x-2">
        {env.NEXT_PUBLIC_APP_ENV !== "production" && (
          <button
            onClick={toggleEruda}
            className=" text-blue-400 hover:text-blue-300 transition-colors px-2 py-1.5 rounded-md border border-gray-200 bg-gray-900">
            Console
          </button>
        )}

        {isConnected && <LogoutButton />}
      </div>
    </header>
  );
}
