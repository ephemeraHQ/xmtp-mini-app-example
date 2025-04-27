import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import { base, mainnet } from "viem/chains";
import { cookieStorage, createConfig, createStorage, http } from "wagmi";

const chains = [mainnet, base] as const;

export const wagmiConfig = createConfig({
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  chains: chains,
  transports: {
    [mainnet.id]: http("https://mainnet.llamarpc.com"),
    [base.id]: http("https://base.llamarpc.com"),
  },
  connectors: [farcasterFrame()],
});

// Function to clear wagmi cookies
export const clearWagmiCookies = () => {
  // wagmi uses these cookie keys
  const wagmiCookieKeys = [
    "wagmi.connected",
    "wagmi.wallet",
    "wagmi.store",
    "wagmi.network",
  ];

  // Clear each wagmi cookie by setting expiration to past date
  wagmiCookieKeys.forEach((key) => {
    document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  });
};
