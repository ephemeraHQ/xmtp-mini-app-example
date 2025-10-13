"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface MemberRendererProps {
  defaultUsers?: string[];
}

export default function MemberRenderer({ defaultUsers = [] }: MemberRendererProps) {
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<string[]>(defaultUsers);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Parse users from URL query parameter
    const usersParam = searchParams?.get("users");
    
    if (usersParam) {
      try {
        // Split by comma and clean up addresses
        const addresses = usersParam
          .split(",")
          .map(addr => addr.trim())
          .filter(addr => {
            // Basic validation: should start with 0x and be 42 characters
            if (addr.startsWith("0x") && addr.length === 42) {
              return true;
            }
            return false;
          });

        if (addresses.length === 0) {
          setError("No valid Ethereum addresses found in URL");
        } else {
          setUsers(addresses);
          setError(null);
        }
      } catch (err) {
        setError("Failed to parse user addresses from URL");
        console.error(err);
      }
    } else if (defaultUsers.length === 0) {
      setError("No users specified. Add ?users=0x...,0x... to the URL");
    }
  }, [searchParams, defaultUsers]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-red-950/20 border border-red-500 rounded-lg">
        <p className="text-red-400 text-center">{error}</p>
        <p className="text-gray-400 text-sm mt-2 text-center">
          Expected format: ?users=0x1234...,0x5678...
        </p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-400">Loading members...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-white">
          Group Members
        </h2>
        <span className="text-sm text-gray-400">
          {users.length} {users.length === 1 ? "member" : "members"}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {users.map((address, index) => (
          <div
            key={address}
            className="flex items-center gap-4 p-4 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors"
          >
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-400 mb-1">Member #{index + 1}</p>
              <p className="text-white font-mono text-sm truncate">
                {address}
              </p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(address);
              }}
              className="flex-shrink-0 px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
              title="Copy address"
            >
              Copy
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

