"use client";

import farcasterFrame from "@farcaster/frame-wagmi-connector";
import { useCallback, useEffect, useState } from "react";
import { hexToUint8Array } from "uint8array-extras";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";
import {
  injected,
  useAccount,
  useConnect,
  useSignMessage,
  useWalletClient,
} from "wagmi";
import { coinbaseWallet } from "wagmi/connectors";
import { Button } from "@/components/Button";
import { useFrame } from "@/context/frame-context";
import { useXMTP } from "@/context/xmtp-context";
import { env } from "@/lib/env";
import {
  createEOASigner,
  createEphemeralSigner,
  createSCWSigner,
} from "@/lib/xmtp";

// Simple local storage keys
const XMTP_CONNECTION_TYPE_KEY = "xmtp:connectionType";
const XMTP_EPHEMERAL_KEY = "xmtp:ephemeralKey";
const XMTP_INITIALIZING = "xmtp:initializing";
const XMTP_INIT_TIMESTAMP = "xmtp:initTimestamp";

export default function WalletConnection() {
  const { context, isInMiniApp } = useFrame();
  const { initialize, initializing, client, error } = useXMTP();
  const { data: walletData } = useWalletClient();
  const { connect } = useConnect();
  const { isConnected, connector, address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [connectionType, setConnectionType] = useState<string>("");
  const [ephemeralAddress, setEphemeralAddress] = useState<string>("");
  const [localInitializing, setLocalInitializing] = useState(false);

  // Get the appropriate signer based on connection type
  const getSigner = useCallback(() => {
    if (!connectionType) return null;

    if (connectionType === "Ephemeral Wallet") {
      const savedPrivateKey = localStorage.getItem(XMTP_EPHEMERAL_KEY);
      if (savedPrivateKey) {
        const formattedKey = savedPrivateKey.startsWith("0x")
          ? (savedPrivateKey as `0x${string}`)
          : (`0x${savedPrivateKey}` as `0x${string}`);

        return createEphemeralSigner(formattedKey);
      }
    }

    if (!isConnected || !walletData) return null;

    if (connectionType === "EOA Wallet") {
      return createEOASigner(walletData.account.address, walletData);
    }

    if (
      connectionType === "Coinbase Smart Wallet" &&
      connector?.id === "coinbaseWalletSDK"
    ) {
      return createSCWSigner(
        walletData.account.address,
        signMessageAsync,
        BigInt(mainnet.id),
      );
    }

    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionType, isConnected, walletData, connector]);

  // Initialize XMTP client with wallet signer
  const initializeXmtp = useCallback(
    async (signer: any) => {
      // Prevent duplicate initialization
      if (initializing || localInitializing) {
        console.log("XMTP initialization already in progress");
        return;
      }

      // Check for stale initialization flag
      const initTimestamp = sessionStorage.getItem(XMTP_INIT_TIMESTAMP);
      if (initTimestamp) {
        const now = Date.now();
        const elapsed = now - parseInt(initTimestamp, 10);

        // If it's been more than 30 seconds, clear the flag
        if (elapsed > 30000) {
          console.log("Clearing stale initialization flag");
          sessionStorage.removeItem(XMTP_INITIALIZING);
          sessionStorage.removeItem(XMTP_INIT_TIMESTAMP);
        } else if (sessionStorage.getItem(XMTP_INITIALIZING) === "true") {
          console.log("XMTP initialization flag active and recent");
          return;
        }
      }

      // Set initializing flags
      setLocalInitializing(true);
      sessionStorage.setItem(XMTP_INITIALIZING, "true");
      sessionStorage.setItem(XMTP_INIT_TIMESTAMP, Date.now().toString());

      try {
        console.log("Initializing XMTP with signer");
        await initialize({
          dbEncryptionKey: hexToUint8Array(env.NEXT_PUBLIC_ENCRYPTION_KEY),
          env: env.NEXT_PUBLIC_XMTP_ENV,
          loggingLevel: "off",
          signer,
        });
      } catch (error) {
        console.error("Error initializing XMTP:", error);

        // If there was a signature error, clear stored connection type to prevent loops
        if (error && (error as any).message?.includes("Signature")) {
          console.log(
            "Signature error detected, clearing connection type to prevent loops",
          );
          localStorage.removeItem(XMTP_CONNECTION_TYPE_KEY);
          setConnectionType("");
        }
      } finally {
        // Clear initializing flags
        sessionStorage.removeItem(XMTP_INITIALIZING);
        sessionStorage.removeItem(XMTP_INIT_TIMESTAMP);
        setLocalInitializing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialize, initializing],
  );

  // Load saved connection on mount
  useEffect(() => {
    // Don't restore if already initialized or currently initializing
    if (client || initializing || localInitializing) return;

    // Don't try to restore if we have an error
    if (error) {
      console.log("Error detected, not restoring connection:", error);
      return;
    }

    // Clear any stale flags
    const initTimestamp = sessionStorage.getItem(XMTP_INIT_TIMESTAMP);
    if (initTimestamp) {
      const now = Date.now();
      const elapsed = now - parseInt(initTimestamp, 10);

      if (elapsed > 30000) {
        sessionStorage.removeItem(XMTP_INITIALIZING);
        sessionStorage.removeItem(XMTP_INIT_TIMESTAMP);
      } else if (sessionStorage.getItem(XMTP_INITIALIZING) === "true") {
        console.log("XMTP initialization in progress, not restoring");
        return;
      }
    }

    // Check for existing connection
    const savedConnectionType = localStorage.getItem(XMTP_CONNECTION_TYPE_KEY);
    if (!savedConnectionType) return;

    console.log(`Restoring connection: ${savedConnectionType}`);
    setConnectionType(savedConnectionType);

    // Set ephemeral address if needed
    if (savedConnectionType === "Ephemeral Wallet") {
      const savedPrivateKey = localStorage.getItem(XMTP_EPHEMERAL_KEY);
      if (savedPrivateKey) {
        const formattedKey = savedPrivateKey.startsWith("0x")
          ? (savedPrivateKey as `0x${string}`)
          : (`0x${savedPrivateKey}` as `0x${string}`);

        const account = privateKeyToAccount(formattedKey);
        setEphemeralAddress(account.address);
      }
    }
  }, [client, initializing, localInitializing, error]);

  // Attempt to initialize when connection type changes or wallet becomes available
  useEffect(() => {
    if (!connectionType || client || initializing || localInitializing) return;

    // Don't try to initialize if we have an error
    if (error) {
      console.log("Error detected, not initializing XMTP:", error);
      return;
    }

    const signer = getSigner();
    if (signer) {
      console.log(`Initializing XMTP with ${connectionType} signer`);
      initializeXmtp(signer);
    } else if (connectionType !== "Ephemeral Wallet" && !isConnected) {
      // For wallet connections, we need to connect first
      console.log(`Need to connect wallet for ${connectionType}`);
    }
  }, [
    connectionType,
    client,
    initializing,
    localInitializing,
    isConnected,
    walletData,
    connector,
    getSigner,
    initializeXmtp,
    error,
  ]);

  // always connect to wagmi farcaster frame to retrieve wallet address
  useEffect(() => {
    if (!isConnected || !address) {
      // if we are in a farcaster context, auto connect to the farcaster frame
      if (context && isInMiniApp) {
        setConnectionType("EOA Wallet");
        localStorage.setItem(XMTP_CONNECTION_TYPE_KEY, "EOA Wallet");
        connect({ connector: farcasterFrame() });
      }

      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address, isInMiniApp]);

  // Connect with EOA wallet
  const connectWithEOA = useCallback(() => {
    if (initializing || localInitializing) return;

    setConnectionType("EOA Wallet");
    localStorage.setItem(XMTP_CONNECTION_TYPE_KEY, "EOA Wallet");

    if (!isConnected) {
      if (context && isInMiniApp) {
        connect({ connector: farcasterFrame() });
      } else {
        connect({ connector: injected() });
      }
    }
  }, [
    connect,
    isConnected,
    initializing,
    localInitializing,
    context,
    isInMiniApp,
  ]);

  // Connect with Ephemeral Wallet
  const connectWithEphemeral = useCallback(() => {
    if (initializing || localInitializing) return;

    setConnectionType("Ephemeral Wallet");

    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    setEphemeralAddress(account.address);

    localStorage.setItem(XMTP_EPHEMERAL_KEY, privateKey);
    localStorage.setItem(XMTP_CONNECTION_TYPE_KEY, "Ephemeral Wallet");

    initializeXmtp(createEphemeralSigner(privateKey));
  }, [initializeXmtp, initializing, localInitializing]);

  // Connect with Coinbase Smart Wallet
  const connectWithCoinbaseSmartWallet = useCallback(() => {
    if (initializing || localInitializing) return;

    // Clear any previous errors that might have accumulated
    sessionStorage.removeItem(XMTP_INITIALIZING);
    sessionStorage.removeItem(XMTP_INIT_TIMESTAMP);

    setConnectionType("Coinbase Smart Wallet");
    localStorage.setItem(XMTP_CONNECTION_TYPE_KEY, "Coinbase Smart Wallet");

    if (!isConnected || connector?.id !== "coinbaseWalletSDK") {
      connect({
        connector: coinbaseWallet({
          appName: "XMTP Mini App",
          preference: { options: "smartWalletOnly" },
        }),
      });
    }
  }, [connect, initializing, localInitializing, isConnected, connector]);

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="w-full flex flex-col gap-3 mt-2">
        <Button
          className="w-full bg-transparent text-white hover:bg-gray-100 hover:text-black "
          size="lg"
          onClick={connectWithEOA}
          disabled={initializing || localInitializing}>
          {(initializing || localInitializing) &&
          connectionType === "EOA Wallet"
            ? "Connecting EOA Wallet..."
            : "Connect with EOA Wallet"}
        </Button>

        <Button
          className="w-full bg-transparent text-white hover:bg-gray-100 hover:text-black "
          size="lg"
          onClick={connectWithEphemeral}
          disabled={initializing || localInitializing}>
          {(initializing || localInitializing) &&
          connectionType === "Ephemeral Wallet"
            ? "Connecting Ephemeral Wallet..."
            : "Connect with Ephemeral Wallet"}
        </Button>

        <Button
          className="w-full bg-transparent text-white hover:bg-gray-100 hover:text-black "
          size="lg"
          onClick={connectWithCoinbaseSmartWallet}
          disabled={initializing || localInitializing}>
          {(initializing || localInitializing) &&
          connectionType === "Coinbase Smart Wallet"
            ? "Connecting Coinbase Smart Wallet..."
            : "Connect with Coinbase Smart Wallet"}
        </Button>
      </div>
    </div>
  );
}
