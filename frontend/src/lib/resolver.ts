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


const NEYNAR_API_KEY = process.env.NEXT_PUBLIC_NEYNAR_API_KEY || "";
const NEYNAR_BASE_URL = "https://api.neynar.com/v2/farcaster";

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
 * Resolve an Ethereum address and enrich with Farcaster profile data
 */
export async function resolveIdentifier(
  identifier: string
): Promise<ResolvedMember> {
  console.log(`[Resolver] ========================================`);
  console.log(`[Resolver] resolveIdentifier called with: "${identifier}"`);
  
  const cleanIdentifier = identifier.trim();
  console.log(`[Resolver] Clean identifier: "${cleanIdentifier}"`);

  // Validate it's an Ethereum address
  const isEthAddress = cleanIdentifier.match(/^0x[a-fA-F0-9]{40}$/);
  if (!isEthAddress) {
    console.log(`[Resolver] Invalid Ethereum address format`);
    return {
      identifier,
      address: null,
      isResolving: false,
      error: "Invalid Ethereum address",
    };
  }

  console.log(`[Resolver] Valid Ethereum address, checking Farcaster...`);
  
  if (!NEYNAR_API_KEY) {
    console.warn("[Resolver] NEYNAR_API_KEY not configured");
    return {
      identifier,
      address: cleanIdentifier,
      isResolving: false,
    };
  }

  try {
    // Search for Farcaster user by address
    const url = `${NEYNAR_BASE_URL}/user/bulk-by-address`;
    const params = { addresses: cleanIdentifier };
    console.log(`[Resolver] Making API request to: ${url}`);
    console.log(`[Resolver] Request params:`, params);
    
    const addressResponse = await ky
      .get(url, {
        searchParams: params,
        headers: {
          "x-api-key": NEYNAR_API_KEY,
        },
        timeout: 5000,
      })
      .json<{ [key: string]: NeynarUser[] }>();

    console.log(`[Resolver] Address lookup response:`, addressResponse);

    // The response is an object with addresses as keys
    const users = addressResponse[cleanIdentifier.toLowerCase()];
    if (users && users.length > 0) {
      const fid = users[0].fid;
      console.log(`[Resolver] Found Farcaster user with FID: ${fid}`);
      
      // Fetch full user profile
      const user = await fetchFarcasterUserByFid(fid);
      
      if (user) {
        console.log(`[Resolver] Successfully enriched address with Farcaster data`);
        
        const resolvedMember: ResolvedMember = {
          identifier,
          address: cleanIdentifier,
          fid: user.fid,
          username: user.username,
          displayName: user.display_name,
          pfpUrl: user.pfp_url,
          ethAddresses: user.verified_addresses.eth_addresses,
          solAddresses: user.verified_addresses.sol_addresses,
          isResolving: false,
        };
        console.log(`[Resolver] Final resolved member:`, resolvedMember);
        return resolvedMember;
      }
    }
    
    console.log(`[Resolver] No Farcaster profile found, returning address only`);
  } catch (error) {
    console.error(`[Resolver] Error checking Farcaster:`, error);
  }
  
  // Return the address even if Farcaster lookup failed
  return {
    identifier,
    address: cleanIdentifier,
    isResolving: false,
  };
}

