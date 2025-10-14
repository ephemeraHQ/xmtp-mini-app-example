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

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || "";
const NEYNAR_BASE_URL = "https://api.neynar.com/v2/farcaster";

/**
 * Search for a Farcaster user by username to get their FID
 */
async function searchFarcasterUser(username: string): Promise<number | null> {
  if (!NEYNAR_API_KEY) {
    console.warn("NEYNAR_API_KEY not configured");
    return null;
  }

  try {
    const response = await ky
      .get(`${NEYNAR_BASE_URL}/user/search`, {
        searchParams: {
          q: username,
          limit: 1,
        },
        headers: {
          "x-api-key": NEYNAR_API_KEY,
        },
        timeout: 5000,
      })
      .json<NeynarSearchResponse>();

    const user = response.result.users[0];
    if (user && user.username.toLowerCase() === username.toLowerCase()) {
      return user.fid;
    }

    return null;
  } catch (error) {
    console.error(`Error searching for user ${username}:`, error);
    return null;
  }
}

/**
 * Fetch Farcaster user data by FID
 */
async function fetchFarcasterUserByFid(
  fid: number
): Promise<NeynarUser | null> {
  if (!NEYNAR_API_KEY) {
    return null;
  }

  try {
    const response = await ky
      .get(`${NEYNAR_BASE_URL}/user/bulk`, {
        searchParams: {
          fids: fid.toString(),
        },
        headers: {
          "x-api-key": NEYNAR_API_KEY,
        },
        timeout: 5000,
      })
      .json<NeynarBulkUsersResponse>();

    return response.users[0] || null;
  } catch (error) {
    console.error(`Error fetching user with FID ${fid}:`, error);
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
  // Clean up identifier
  const cleanIdentifier = identifier.trim().replace(/^@/, "");

  // Check if it's already a full Ethereum address
  if (cleanIdentifier.match(/^0x[a-fA-F0-9]{40}$/)) {
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
  }

  // Try to resolve via Neynar
  try {
    const fid = await searchFarcasterUser(username);

    if (fid) {
      const user = await fetchFarcasterUserByFid(fid);

      if (user) {
        const baseDomain = extractBaseDomain(user.verified_addresses.eth_addresses);
        const primaryAddress = user.verified_addresses.eth_addresses[0] || user.custody_address;

        return {
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
      }
    }

    // If Neynar resolution failed, return null
    return {
      identifier,
      address: null,
      isResolving: false,
      error: "User not found on Farcaster",
    };
  } catch (error) {
    console.error(`Error resolving ${identifier}:`, error);
    return {
      identifier,
      address: null,
      isResolving: false,
      error: "Resolution failed",
    };
  }
}

