"use client";

import farcasterFrame from "@farcaster/frame-wagmi-connector";
import { ClientOptions, Group } from "@xmtp/browser-sdk";
import { useCallback, useEffect, useState } from "react";
import { hexToUint8Array } from "uint8array-extras";
import { useLocalStorage } from "usehooks-ts";
import { mainnet } from "viem/chains";
import {
  injected,
  useAccount,
  useConnect,
  useDisconnect,
  useWalletClient,
} from "wagmi";
import { Button } from "@/components/shadcn/button";
import { FullPageLoader } from "@/components/ui/fullpage-loader";
import { Header } from "@/components/ui/header";
import { SafeAreaContainer } from "@/components/ui/safe-area-container";
import { useFrame } from "@/context/frame-context";
import { useXMTP } from "@/context/xmtp-context";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";
import { createSCWSigner } from "@/lib/utils/xmtp";
import { clearWagmiCookies } from "@/lib/wagmi";

export default function Page() {
  const { context, actions } = useFrame();
  const insets = context ? context.client.safeAreaInsets : undefined;

  // XMTP State
  const {
    client,
    initialize,
    initializing,
    conversations,
    setConversations,
    disconnect: disconnectXmtp,
  } = useXMTP();
  const [loggingLevel] = useLocalStorage<ClientOptions["loggingLevel"]>(
    "XMTP_LOGGING_LEVEL",
    "off",
  );

  // Add reconnect disabled flag to prevent auto-reconnection after logout
  const [reconnectDisabled, setReconnectDisabled] = useState(false);

  // Wallet State
  const { data: walletData } = useWalletClient();
  const { isConnected, address } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  // Group Chat State
  const [joining, setJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGroupJoined, setIsGroupJoined] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupConversation, setGroupConversation] = useState<Group | null>(
    null,
  );
  const [hasAttemptedRefresh, setHasAttemptedRefresh] = useState(false);

  // Connect to wallet
  useEffect(() => {
    if (!isConnected || !address) {
      if (context) {
        connect({ connector: farcasterFrame() });
      } else {
        connect({ connector: injected() });
      }
    }
  }, [isConnected, address, context, connect]);

  // Initialize XMTP client with wallet signer
  useEffect(() => {
    let mounted = true;

    if (walletData?.account && !reconnectDisabled && mounted) {
      void initialize({
        dbEncryptionKey: hexToUint8Array(env.NEXT_PUBLIC_ENCRYPTION_KEY),
        env: env.NEXT_PUBLIC_XMTP_ENV,
        loggingLevel,
        signer: createSCWSigner(
          walletData.account.address,
          walletData,
          BigInt(mainnet.id),
        ),
      });
    }

    // Cleanup function to prevent state updates after unmount
    return () => {
      mounted = false;
    };
  }, [walletData, initialize, loggingLevel, reconnectDisabled]);

  // Save the frame to the Farcaster context
  useEffect(() => {
    async function saveFrame() {
      if (context && !context.client.added) {
        try {
          await actions?.addFrame();
        } catch (e) {
          console.error("Error adding frame:", e);
        }
      }
    }
    saveFrame();
  }, [context, actions]);

  // Fetch group ID and check membership
  const handleFetchGroupId = useCallback(async () => {
    try {
      if (isRefreshing || !client || !client.inboxId) {
        return;
      }

      const getGroupId = async () => {
        const res = await fetch(
          `/api/proxy/get-group-id?inboxId=${client.inboxId}`,
        );
        const data = await res.json();
        return { groupId: data.groupId, isMember: data.isMember };
      };

      const { groupId, isMember } = await getGroupId();
      setIsGroupJoined(isMember);

      const foundGroup = conversations.find(
        (conv) => conv.id === groupId,
      ) as Group;

      if (foundGroup) {
        await foundGroup?.sync();
        if (foundGroup.isActive) {
          setGroupName(foundGroup.name ?? "XMTP Mini app");
          setGroupConversation(foundGroup);
        }
      } else if (isMember && client && !hasAttemptedRefresh) {
        setIsRefreshing(true);
        setHasAttemptedRefresh(true);
        try {
          const newConversations = await client.conversations.list();
          setConversations(newConversations);
        } catch (error) {
          console.error("Error refreshing conversations:", error);
        } finally {
          setIsRefreshing(false);
        }
      }
    } catch (error) {
      console.error("Error fetching group ID:", error);
      setErrorMessage("Failed to fetch group ID");
    }
  }, [
    client,
    conversations,
    hasAttemptedRefresh,
    isRefreshing,
    setConversations,
  ]);

  // Fetch group when client is available
  useEffect(() => {
    if (client) {
      handleFetchGroupId();
    }
  }, [client, handleFetchGroupId]);

  // Check for group when conversations change
  useEffect(() => {
    if (conversations.length > 0 && !isGroupJoined && !hasAttemptedRefresh) {
      const timer = setTimeout(() => {
        handleFetchGroupId();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [conversations, isGroupJoined, hasAttemptedRefresh, handleFetchGroupId]);

  // Leave group handler
  const handleLeaveGroup = async () => {
    if (!client) return;

    try {
      setJoining(true);
      const data = await fetch(`/api/proxy/remove-inbox`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inboxId: client.inboxId,
        }),
      }).then((res) => res.json());

      setJoining(false);

      if (data.success) {
        const newConversations = await client.conversations.list();
        setConversations(newConversations);
        setIsGroupJoined(false);
        setGroupConversation(null);
      } else {
        console.warn("Failed to leave group", data);
        setErrorMessage(data.message);
      }
    } catch (error) {
      console.error("Error leaving group", error);
      setErrorMessage("Failed to leave group");
      setJoining(false);
    }
  };

  // Join group handler
  const handleJoinGroup = async () => {
    if (!client) return;

    try {
      setJoining(true);
      const data = await fetch(`/api/proxy/add-inbox`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inboxId: client.inboxId,
        }),
      }).then((res) => res.json());

      setJoining(false);

      if (data.success) {
        const newConversations = await client.conversations.list();
        setConversations(newConversations);
        handleFetchGroupId();
      } else {
        console.warn("Failed to join group", data);
        setErrorMessage(data.message);
      }
    } catch (error) {
      console.error("Error joining group", error);
      setErrorMessage("Failed to join group");
      setJoining(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    // Set reconnect disabled to prevent auto-reconnection
    setReconnectDisabled(true);

    // Call logout API to clear auth cookie
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include", // Important to include cookies
      });

      // Clear any client-side storage that might be keeping auth state
      localStorage.clear();
      sessionStorage.clear();

      // Clear wagmi cookies specifically
      clearWagmiCookies();

      // Also manually clear any other cookies from client side
      document.cookie.split(";").forEach(function (c) {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

      // Disconnect from services
      disconnectXmtp();
      disconnect();
      setIsGroupJoined(false);
      setGroupConversation(null);

      // Force a hard page refresh to reset all state completely
      window.location.href = window.location.origin;
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  // Main button action based on joined state
  const mainButtonAction = isGroupJoined ? handleLeaveGroup : handleJoinGroup;
  const mainButtonText = isGroupJoined
    ? `Leave Group${groupName ? `: ${groupName}` : ""}`
    : "Join Group Chat";
  const buttonColor = isGroupJoined ? "destructive" : "default";

  return (
    <SafeAreaContainer insets={insets}>
      <div className="flex flex-col gap-0 pb-1 w-full max-w-md mx-auto h-screen bg-black transition-all duration-300">
        <Header />
        {initializing ? (
          <FullPageLoader />
        ) : (
          <div className="flex flex-col gap-4 px-4 py-4 h-full">
            {client && (
              <div className="flex flex-col gap-2">
                <div className="text-white text-sm">
                  <span className="text-gray-400">Your XMTP Inbox ID: </span>
                  <span className="font-mono text-xs">
                    {client.inboxId
                      ? client.inboxId.slice(0, 10) +
                        "..." +
                        client.inboxId.slice(-10)
                      : "Not available"}
                  </span>
                </div>
              </div>
            )}

            <div className="w-full flex flex-col items-center justify-center gap-4 py-4">
              {!isConnected ? (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => connect({ connector: injected() })}>
                  Connect Wallet
                </Button>
              ) : (
                <>
                  <Button
                    className="w-full"
                    size="lg"
                    variant={buttonColor}
                    onClick={mainButtonAction}
                    disabled={joining || isRefreshing || !client}>
                    {joining ? "Processing..." : mainButtonText}
                  </Button>

                  <Button
                    className="w-full"
                    size="sm"
                    variant="destructive"
                    onClick={() => void handleLogout()}>
                    Logout
                  </Button>
                </>
              )}

              {errorMessage && (
                <div className="text-red-500 text-sm mt-2">{errorMessage}</div>
              )}
            </div>

            {groupConversation && isGroupJoined && (
              <div className="mt-4 text-center text-slate-400">
                You have joined the group: {groupName}
              </div>
            )}
          </div>
        )}
      </div>
    </SafeAreaContainer>
  );
}
