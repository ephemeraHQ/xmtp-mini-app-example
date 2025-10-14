
/**
 * Resolves an identifier to an Ethereum address using web3.bio API
 * @param identifier - Domain name to resolve (e.g., "vitalik.eth", "fabrizioeth.farcaster.eth")
 * @returns Ethereum address or null if not found
 */
const resolveViaBio = async (identifier: string): Promise<string | null> => {
  try {
    // Use web3.bio API for resolution with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    
    const response = await fetch(`https://api.web3.bio/profile/${identifier}`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.warn(`API returned ${response.status} for ${identifier}`);
      return null;
    }

    const data = await response.json();
    
    // web3.bio returns an array of profiles, we take the first one
    if (Array.isArray(data) && data.length > 0 && data[0].address) {
      return data[0].address;
    }
    
    console.warn(`No address found for ${identifier}`);
    return null;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`Request timeout for ${identifier}`);
    } else {
      console.error(`Failed to resolve ${identifier}:`, error);
    }
    return null;
  }
};



/**
 * Represents a resolved member with their original identifier and address
 */
export interface ResolvedMember {
  identifier: string;
  address: string | null;
  isResolving: boolean;
  error?: string;
}

