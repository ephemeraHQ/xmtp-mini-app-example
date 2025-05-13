import { farcasterFrame as miniAppConnector } from "@farcaster/frame-wagmi-connector";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cookieStorage,
  cookieToInitialState,
  createConfig,
  createStorage,
  http,
  WagmiProvider,
  type Config,
} from "wagmi";
import { base, mainnet } from "wagmi/chains";

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

export const wagmiConfig = createConfig({
  chains: [mainnet, base],
  transports: {
    [base.id]: http(),
    [mainnet.id]: http(),
  },
  connectors: [miniAppConnector()],
  storage: createStorage({
    storage: cookieStorage,
  }),
});

const queryClient = new QueryClient();

export default function MiniAppWalletProvider({
  children,
  cookies,
}: {
  children: React.ReactNode;
  cookies: string | null;
}) {
  const initialState = cookieToInitialState(wagmiConfig as Config, cookies);
  return (
    <WagmiProvider config={wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
