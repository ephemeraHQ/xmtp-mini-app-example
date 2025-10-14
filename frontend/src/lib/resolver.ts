import ky from "ky";

// Type definitions
export interface ResolvedMember {
  identifier: string;
  address: string | null;
  isResolving?: boolean;
  error?: string;
  // Farcaster data
  fid?: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  baseDomain?: string;
  ethAddresses?: string[];
  solAddresses?: string[];
}

interface NeynarUser {
  fid: number;
  username: string;
  display_name: string;
  pfp_url: string;
  custody_address: string;
  verified_addresses: {
    eth_addresses: string[];
    sol_addresses: string[];
  };
}

interface NeynarBulkUsersResponse {
  users: NeynarUser[];
}

interface NeynarSearchResponse {
  result: {
    users: Array<{
      fid: number;
      username: string;
      display_name: string;
      pfp_url: string;
    }>;
  };
}

const NEYNAR_API_KEY = process.env.NEXT_PUBLIC_NEYNAR_API_KEY || "";
const NEYNAR_BASE_URL = "https://api.neynar.com/v2/farcaster";

/**
 * Search for a Farcaster user by username to get their FID
 */
async function searchFarcasterUser(username: string): Promise<number | null> {
  console.log(`[Neynar] searchFarcasterUser called with username: "${username}"`);
  
  if (!NEYNAR_API_KEY) {
    console.warn("[Neynar] NEYNAR_API_KEY not configured");
    return null;
  }

  try {
    const url = `${NEYNAR_BASE_URL}/user/search`;
    const params = { q: username, limit: 1 };
    console.log(`[Neynar] Making API request to: ${url}`);
    console.log(`[Neynar] Search params:`, params);
    
    const response = await ky
      .get(url, {
        searchParams: params,
        headers: {
          "x-api-key": NEYNAR_API_KEY,
        },
        timeout: 5000,
      })
      .json<NeynarSearchResponse>();

    console.log(`[Neynar] Search response:`, response);

    const user = response.result.users[0];
    if (user && user.username.toLowerCase() === username.toLowerCase()) {
      console.log(`[Neynar] Found user with FID: ${user.fid}, username: ${user.username}`);
      return user.fid;
    }

    console.log(`[Neynar] No matching user found for username: ${username}`);
    return null;
  } catch (error) {
    console.error(`[Neynar] Error searching for user ${username}:`, error);
    return null;
  }
}

/**
 * Fetch Farcaster user data by FID
 */
async function fetchFarcasterUserByFid(
  fid: number
): Promise<NeynarUser | null> {
  console.log(`[Neynar] fetchFarcasterUserByFid called with FID: ${fid}`);
  
  if (!NEYNAR_API_KEY) {
    console.warn("[Neynar] NEYNAR_API_KEY not configured");
    return null;
  }

  try {
    const url = `${NEYNAR_BASE_URL}/user/bulk`;
    const params = { fids: fid.toString() };
    console.log(`[Neynar] Making API request to: ${url}`);
    console.log(`[Neynar] Request params:`, params);
    
    const response = await ky
      .get(url, {
        searchParams: params,
        headers: {
          "x-api-key": NEYNAR_API_KEY,
        },
        timeout: 5000,
      })
      .json<NeynarBulkUsersResponse>();

    console.log(`[Neynar] Bulk user response:`, response);
    
    const user = response.users[0] || null;
    if (user) {
      console.log(`[Neynar] Retrieved user data:`, {
        fid: user.fid,
        username: user.username,
        display_name: user.display_name,
        custody_address: user.custody_address,
        verified_eth_addresses: user.verified_addresses.eth_addresses,
        verified_sol_addresses: user.verified_addresses.sol_addresses,
      });
    } else {
      console.log(`[Neynar] No user found for FID: ${fid}`);
    }
    
    return user;
  } catch (error) {
    console.error(`[Neynar] Error fetching user with FID ${fid}:`, error);
    return null;
  }
}

/**
 * Extract base domain from verified addresses
 * Looks for addresses ending in .base.eth
 */
function extractBaseDomain(ethAddresses: string[]): string | undefined {
  // In Neynar's API, verified_addresses contains actual addresses, not ENS names
  // Base domains would need to be resolved separately or come from a different source
  // For now, we'll return undefined and rely on the username
  return undefined;
}

/**
 * Resolve an identifier using Neynar API
 * Supports: @username, username, username.base.eth, or direct addresses
 */
export async function resolveIdentifier(
  identifier: string
): Promise<ResolvedMember> {
  console.log(`[Resolver] ========================================`);
  console.log(`[Resolver] resolveIdentifier called with: "${identifier}"`);
  
  // Clean up identifier
  const cleanIdentifier = identifier.trim().replace(/^@/, "");
  console.log(`[Resolver] Clean identifier: "${cleanIdentifier}"`);

  // Check if it's already a full Ethereum address
  if (cleanIdentifier.match(/^0x[a-fA-F0-9]{40}$/)) {
    console.log(`[Resolver] Detected as Ethereum address, returning as-is`);
    return {
      identifier,
      address: cleanIdentifier,
      isResolving: false,
    };
  }

  // Extract username from various formats
  let username = cleanIdentifier;

  // Handle domain formats (username.base.eth, username.eth, etc.)
  if (cleanIdentifier.includes(".")) {
    // Extract the username part (first segment)
    username = cleanIdentifier.split(".")[0];
    console.log(`[Resolver] Detected domain format, extracted username: "${username}"`);
  }

  // Try to resolve via Neynar
  try {
    console.log(`[Resolver] Attempting to resolve via Neynar with username: "${username}"`);
    const fid = await searchFarcasterUser(username);
    console.log(`[Resolver] Search result - FID:`, fid);
    
    if (fid) {
      console.log(`[Resolver] FID found: ${fid}, fetching user details...`);
      const user = await fetchFarcasterUserByFid(fid);
      console.log(`[Resolver] Fetch result - User:`, user);
      
      if (user) {
        const baseDomain = extractBaseDomain(user.verified_addresses.eth_addresses);
        const primaryAddress = user.verified_addresses.eth_addresses[0] || user.custody_address;
        console.log(`[Resolver] Successfully resolved to primary address: ${primaryAddress}`);

        const resolvedMember: ResolvedMember = {
          identifier,
          address: primaryAddress,
          fid: user.fid,
          username: user.username,
          displayName: user.display_name,
          pfpUrl: user.pfp_url,
          baseDomain,
          ethAddresses: user.verified_addresses.eth_addresses,
          solAddresses: user.verified_addresses.sol_addresses,
          isResolving: false,
        };
        console.log(`[Resolver] Final resolved member:`, resolvedMember);
        return resolvedMember;
      } else {
        console.log(`[Resolver] FID found but failed to fetch user details`);
      }
    } else {
      console.log(`[Resolver] No FID found for username: ${username}`);
    }
    
    console.log(`[Resolver] Resolution failed - user not found on Farcaster`);
    return {
      identifier,
      address: null,
      isResolving: false,
      error: "User not found on Farcaster",
    };
  } catch (error) {
    console.error(`[Resolver] Error resolving ${identifier}:`, error);
    console.log(`[Resolver] Error details:`, error);
    return {
      identifier,
      address: null,
      isResolving: false,
      error: "Resolution failed",
    };
  }
}

