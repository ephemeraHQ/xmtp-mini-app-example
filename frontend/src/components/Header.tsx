import { env } from "@/lib/env";
import Image from "next/image";
import Link from "next/link";

export function Header() {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
      <Link href="/" className="flex items-center gap-2">
       
        <span className="text-white font-medium">XMTP Debugger</span>
      </Link>
   
    </header>
  );
} 