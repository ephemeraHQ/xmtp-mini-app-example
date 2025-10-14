import Link from "next/link";
import { env } from "@/lib/env";
import { useEruda } from "@/providers/eruda";

interface HeaderProps {
  isConnected?: boolean;
}

export function Header({ isConnected }: HeaderProps) {
  // Use the Eruda context to access toggle functionality
  const { toggleEruda } = useEruda();

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
      <Link href="/" className="flex items-center gap-2">
        <span className="text-white font-medium">XMTP Mini App</span>
      </Link>

    </header>
  );
}
