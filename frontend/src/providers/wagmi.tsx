"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cookieToInitialState, WagmiProvider, type Config } from "wagmi";
import { base, mainnet, sepolia, baseSepolia } from "viem/chains";
import { Storage, createConfig, createStorage, http } from "wagmi";
import { injected, metaMask } from "wagmi/connectors";

const queryClient = new QueryClient();

interface CustomWagmiProviderProps {
  children: React.ReactNode;
  cookies: string | null;
}
export const CustomWagmiProvider = ({
  children,
  cookies,
}: CustomWagmiProviderProps) => {
  const initialState = cookieToInitialState(wagmiConfig as Config, cookies);

  return (
    <WagmiProvider config={wagmiConfig as Config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
};



export const wagmiConfig = createConfig({

  ssr: true,
  chains: [mainnet, base, sepolia, baseSepolia],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  // Add the injected connector - this was missing!
  connectors: [
    injected(),
    metaMask(),
  ],
});