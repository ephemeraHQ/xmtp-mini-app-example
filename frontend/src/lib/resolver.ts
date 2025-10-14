/**
 * Matches a shortened address against a list of full addresses
 * @param shortenedAddress - Shortened address like "0xabc5…f002"
 * @param fullAddresses - Array of full Ethereum addresses to match against
 * @returns Matched full address or null if no match found
 */
export const matchShortenedAddress = (
  shortenedAddress: string,
  fullAddresses: string[],
): string | null => {
  // Extract prefix and suffix from shortened address
  const match = shortenedAddress.match(
    /^(0x[a-fA-F0-9]+)(?:…|\.{2,3})([a-fA-F0-9]+)$/,
  );
  if (!match) return null;

  const [, prefix, suffix] = match;

  // Find a matching full address
  for (const fullAddress of fullAddresses) {
    const normalizedAddress = fullAddress.toLowerCase();
    if (
      normalizedAddress.startsWith(prefix.toLowerCase()) &&
      normalizedAddress.endsWith(suffix.toLowerCase())
    ) {
      return fullAddress;
    }
  }

  return null;
};

/**
 * Resolves an identifier to an Ethereum address using web3.bio API
 * @param identifier - Domain name to resolve (e.g., "vitalik.eth", "fabrizioeth.farcaster.eth")
 * @returns Ethereum address or null if not found
 */
const resolveViaBio = async (identifier: string): Promise<string | null> => {
  try {
    // Use web3.bio API for resolution
    const response = await fetch(`https://api.web3.bio/profile/${identifier}`);
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    // web3.bio returns an array of profiles, we take the first one
    if (Array.isArray(data) && data.length > 0 && data[0].address) {
      return data[0].address;
    }
    
    return null;
  } catch (error) {
    console.error(`Failed to resolve ${identifier}:`, error);
    return null;
  }
};

/**
 * Resolves an identifier to an Ethereum address
 * Handles full addresses, shortened addresses (in groups), and domain names
 * @param identifier - Ethereum address or domain name to resolve
 * @param memberAddresses - Optional array of member addresses to match shortened addresses against
 * @returns Ethereum address or null if not found
 */
export const resolveIdentifier = async (
  identifier: string,
  memberAddresses?: string[],
): Promise<string | null> => {
  // If it's already a full ethereum address, return it
  if (identifier.match(/^0x[a-fA-F0-9]{40}$/)) {
    return identifier;
  }

  // If it's a shortened address, try to match against member addresses
  if (identifier.match(/0x[a-fA-F0-9]+(?:…|\.{2,3})[a-fA-F0-9]+/)) {
    if (memberAddresses && memberAddresses.length > 0) {
      return matchShortenedAddress(identifier, memberAddresses);
    }
    return null;
  }

  // If it's just a username (no dots), append .farcaster.eth
  if (!identifier.includes(".")) {
    identifier = `${identifier}.farcaster.eth`;
  }

  // Otherwise, resolve using web3.bio API
  return resolveViaBio(identifier);
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

