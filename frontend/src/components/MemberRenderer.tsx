"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { resolveIdentifier, type ResolvedMember } from "@/lib/resolver";

interface MemberRendererProps {
  defaultTags?: string[];
}

export default function MemberRenderer({ defaultTags = [] }: MemberRendererProps) {
  const searchParams = useSearchParams();
  const [members, setMembers] = useState<ResolvedMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    const resolveTags = async (tags: string[]) => {
      if (tags.length === 0) return;

      setIsResolving(true);
      setError(null);

      // Initialize members with resolving state
      const initialMembers: ResolvedMember[] = tags.map((tag) => ({
        identifier: tag,
        address: null,
        isResolving: true,
      }));
      setMembers(initialMembers);

      // Resolve each tag
      const resolvedMembers = await Promise.all(
        tags.map(async (tag) => {
          try {
            const address = await resolveIdentifier(tag);
            return {
              identifier: tag,
              address,
              isResolving: false,
              error: address ? undefined : "Failed to resolve",
            };
          } catch (err) {
            console.error(`Error resolving ${tag}:`, err);
            return {
              identifier: tag,
              address: null,
              isResolving: false,
              error: "Resolution error",
            };
          }
        })
      );

      setMembers(resolvedMembers);
      setIsResolving(false);
    };

    // Parse tags from URL query parameter
    const tagsParam = searchParams?.get("tags");
    
    if (tagsParam) {
      try {
        // Split by comma and clean up tags
        const tags = tagsParam
          .split(",")
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0);

        if (tags.length === 0) {
          setError("No valid tags found in URL");
        } else {
          resolveTags(tags);
        }
      } catch (err) {
        setError("Failed to parse tags from URL");
        console.error(err);
      }
    } else if (defaultTags.length > 0) {
      resolveTags(defaultTags);
    } else {
      setError("No tags specified. Add ?tags=vitalik.eth,... to the URL");
    }
  }, [searchParams, defaultTags]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-red-950/20 border border-red-500 rounded-lg">
        <p className="text-red-400 text-center">{error}</p>
        <p className="text-gray-400 text-sm mt-2 text-center">
          Expected format: ?tags=vitalik.eth,fabrizioeth,...
        </p>
      </div>
    );
  }

  if (members.length === 0 && !isResolving) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-400">No members to display</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between mb-2">
       
        <span className="text-sm text-gray-400">
          {members.length} {members.length === 1 ? "member" : "members"}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {members.map((member, index) => (
          <div
            key={member.identifier}
            className="flex items-center gap-4 p-4 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors"
          >
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              {/* Primary: Name/Identifier */}
              <p className="text-white font-medium text-base mb-1">
                {member.identifier}
              </p>
              
              {/* Secondary: Resolved Address or Status */}
              {member.isResolving ? (
                <p className="text-gray-500 text-sm">
                  <span className="inline-block animate-pulse">Resolving...</span>
                </p>
              ) : member.address ? (
                <p className="text-gray-400 font-mono text-xs truncate">
                  {member.address}
                </p>
              ) : (
                <p className="text-red-400 text-xs">
                  {member.error || "Failed to resolve"}
                </p>
              )}
            </div>
            
            {/* Copy button - only show if resolved */}
            {member.address && !member.isResolving && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(member.address!);
                }}
                className="flex-shrink-0 px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
                title="Copy address"
              >
                Copy
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

