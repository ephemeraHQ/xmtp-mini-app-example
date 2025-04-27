"use client";

// Add dynamic import with noSSR
import dynamic from 'next/dynamic';
import { Group } from "@xmtp/browser-sdk";
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
import { Button } from "@/components/Button";
import { FullPageLoader } from "@/components/FullPageLoader";
import { Header } from "@/components/Header";
import { SafeAreaContainer } from "@/components/SafeAreaContainer";
// Don't import directly - will use dynamic import
// import { useFrame } from "@/context/frame-context";
import { useXMTP } from "@/context/xmtp-context";
import { env } from "@/lib/env";
import { createSCWSigner, createEphemeralSigner, createEOASigner } from "@/lib/xmtp";
import { clearWagmiCookies } from "@/lib/wagmi";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

// Define the ClientOptions type locally to fix the error
type ClientOptions = {
  loggingLevel: "debug" | "info" | "warn" | "error" | "off" | "trace" | undefined;
};

// Define a component that safely uses frame context
function InnerPageComponent({ frameContext }: { frameContext: { context: any; actions: any } }) {
  const context = frameContext?.context;
  const actions = frameContext?.actions;
  const insets = context?.client?.safeAreaInsets;

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
  const [groupConversation, setGroupConversation] = useState<Group | null>(null);
  const [hasAttemptedRefresh, setHasAttemptedRefresh] = useState(false);
  const [groupMemberCount, setGroupMemberCount] = useState(0);
  const [groupMessageCount, setGroupMessageCount] = useState(0);
  
  // Backend Server Info
  const [backendInfo, setBackendInfo] = useState<{
    groupId: string;
    groupName: string;
    members: Array<{
      inboxId: string;
      displayInboxId: string;
      isAdmin: boolean;
      isSuperAdmin: boolean;
    }>;
    lastMessage: {
      id: string;
      content: string;
      sentAt: string;
      senderInboxId: string;
      displaySenderId: string;
    } | null;
    memberCount: number;
    messageCount: number;
  } | null>(null);
  
  // Connection State
  const [connectionType, setConnectionType] = useState<string>("");
  const [ephemeralAddress, setEphemeralAddress] = useState<string>("");

  // Initialize XMTP client with wallet signer
  const initializeXmtp = useCallback((signer: any) => {
    if (!reconnectDisabled) {
      void initialize({
        dbEncryptionKey: hexToUint8Array(env.NEXT_PUBLIC_ENCRYPTION_KEY),
        env: env.NEXT_PUBLIC_XMTP_ENV,
        loggingLevel,
        signer,
      });
    }
  }, [initialize, loggingLevel, reconnectDisabled]);

  // Connect with EOA wallet
  const connectWithEOA = useCallback(() => {
    try {
      // If already connecting with this method, don't try again
      if (connectionType === "EOA Wallet" && initializing) return;
      
      setConnectionType("EOA Wallet");
      setErrorMessage(null);
      
      if (isConnected && walletData) {
        initializeXmtp(createEOASigner(walletData.account.address, walletData));
      } else {
        connect({ connector: injected() });
      }
    } catch (error) {
      console.error("Error connecting with EOA:", error);
      setErrorMessage("Failed to connect with EOA wallet");
    }
  }, [connect, initializing, isConnected, walletData, initializeXmtp, connectionType]);

  // Connect with Smart Contract Wallet
  const connectWithSCW = useCallback(() => {
    try {
      // If already connecting with this method, don't try again
      if (connectionType === "Smart Contract Wallet" && initializing) return;
      
      setErrorMessage(null);
      setConnectionType("Smart Contract Wallet");
      
      // Connect wallet first if not already connected
      if (!isConnected || !walletData?.account) {
        connect({ connector: injected() });
      } else {
        // If wallet is already connected, initialize XMTP with SCW signer
        initializeXmtp(
          createSCWSigner(
            walletData.account.address,
            walletData,
            BigInt(mainnet.id),
          )
        );
      }
    } catch (error) {
      console.error("Error connecting with SCW:", error);
      setErrorMessage("Failed to connect with Smart Contract wallet");
    }
  }, [connect, initializeXmtp, walletData, initializing, isConnected, connectionType]);

  // Connect with Ephemeral Wallet
  const connectWithEphemeral = useCallback(() => {
    try {
      // If already connecting with this method, don't try again
      if (connectionType === "Ephemeral Wallet" && initializing) return;
      
      setErrorMessage(null);
      setConnectionType("Ephemeral Wallet");
      const privateKey = generatePrivateKey();
      
      // Generate and store the address from the private key
      const account = privateKeyToAccount(privateKey);
      setEphemeralAddress(account.address);
      
      const connect = async () => {
        try {
          const ephemeralSigner = createEphemeralSigner(privateKey);
          await initializeXmtp(ephemeralSigner);
          console.log("Successfully initialized XMTP with ephemeral wallet");
        } catch (error) {
          console.error("Error initializing XMTP with ephemeral wallet:", error);
          // Only retry once
          if ((error as Error).message.includes("network") || (error as Error).message.includes("timeout")) {
            console.log("Network error, attempting to retry in 2 seconds...");
            setTimeout(async () => {
              try {
                const ephemeralSigner = createEphemeralSigner(privateKey);
                await initializeXmtp(ephemeralSigner);
                console.log("Retry successful: initialized XMTP with ephemeral wallet");
              } catch (retryError) {
                console.error("Retry failed:", retryError);
                setErrorMessage(`Failed to connect: ${(retryError as Error).message}`);
              }
            }, 2000);
          } else {
            setErrorMessage(`Failed to connect: ${(error as Error).message}`);
          }
        }
      };
      
      void connect();
    } catch (error) {
      console.error("Error connecting with ephemeral wallet:", error);
      setErrorMessage("Failed to connect with ephemeral wallet");
    }
  }, [initializeXmtp, initializing, connectionType]);

  // Listen for wallet connection changes for EOA mode
  useEffect(() => {
    if (isConnected && walletData && !client && !initializing && !reconnectDisabled && connectionType === "") {
      // When wallet connects but XMTP client isn't initialized, and no connection type is set
      setConnectionType("EOA Wallet");
      initializeXmtp(createEOASigner(walletData.account.address, walletData));
    }
  }, [isConnected, walletData, client, initializing, reconnectDisabled, connectionType, initializeXmtp]);

  // Listen for wallet connection changes for SCW mode
  useEffect(() => {
    if (isConnected && walletData?.account && !client && !initializing && !reconnectDisabled && connectionType === "Smart Contract Wallet") {
      // When wallet connects in SCW mode
      initializeXmtp(
        createSCWSigner(
          walletData.account.address,
          walletData,
          BigInt(mainnet.id),
        )
      );
    }
  }, [isConnected, walletData, client, initializing, reconnectDisabled, connectionType, initializeXmtp]);

  // Connect to wallet
  useEffect(() => {
    if (!isConnected || !address) {
      if (context) {
        // Use injected connector since we removed farcasterFrame
        connect({ connector: injected() });
      } else {
        connect({ connector: injected() });
      }
    }
  }, [isConnected, address, context, connect]);

  // Add debug effect to monitor client status
  useEffect(() => {
    if (client) {
      console.log("XMTP client initialized:", client);
      
      // When client is ready, make sure to fetch conversations
      const loadConversations = async () => {
        try {
          await client.conversations.sync();
          const convos = await client.conversations.list();
          console.log("Loaded conversations:", convos.length);
          
          // Debug log the conversation objects
          convos.forEach((conv, i) => {
            if (i < 5) { // Limit to first 5 to prevent log spam
              console.log(`Conversation ${i}:`, conv);
              console.log(`Conversation ${i} toString:`, String(conv));
            }
          });
          
          setConversations(convos);
        } catch (error) {
          console.error("Error loading conversations:", error);
        }
      };
      
      void loadConversations();
    } else {
      // If client is disconnected, reset related state
      setBackendInfo(null);
    }
  }, [client, setConversations]);

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

  // Clear any error messages after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Fetch group ID and check membership
  const handleFetchGroupId = useCallback(async () => {
    if (!client || !client.inboxId) {
      console.log("Cannot fetch group: No client or inboxId available");
      return;
    }
    
    if (isRefreshing) {
      console.log("Already refreshing, skipping fetch");
      return;
    }

    try {
      setIsRefreshing(true);
      console.log("Fetching group ID for inbox:", client.inboxId);
      
      const getGroupId = async () => {
        const res = await fetch(
          `/api/proxy/get-group-id?inboxId=${client.inboxId}`,
        );
        if (!res.ok) {
          throw new Error(`Failed to fetch group ID: ${res.status} ${res.statusText}`);
        }
        const data = await res.json();
        console.log("Group data received:", data);
        
        // Validate the data before setting it
        if (data && typeof data === 'object') {
          // Check if it has the expected properties and not an update object
          if (
            !('initiatedByInboxId' in data) &&
            !('addedInboxes' in data) &&
            !('removedInboxes' in data) &&
            !('metadataFieldChanges' in data)
          ) {
            // Store the backend info for display
            setBackendInfo(data);
          } else {
            console.warn("Received unexpected data format - appears to be an update object", data);
            // Do not set backendInfo if it's an update object
          }
        }
        
        return { 
          groupId: data && typeof data === 'object' && typeof data.groupId === 'string' ? data.groupId : null, 
          isMember: data && typeof data === 'object' && typeof data.isMember === 'boolean' ? data.isMember : false 
        };
      };

      const { groupId, isMember } = await getGroupId();
      setIsGroupJoined(isMember);
      console.log(`Group membership status: ${isMember ? "Member" : "Not a member"}, Group ID: ${groupId || "none"}`);

      if (!isMember || !groupId) {
        console.log("Not a member or no group ID, clearing group data");
        setGroupConversation(null);
        setGroupMemberCount(0);
        setGroupMessageCount(0);
        setIsRefreshing(false);
        setHasAttemptedRefresh(true);
        return;
      }
      
      // First try to find the group in existing conversations
      try {
        // Filter conversations to exclude update objects
        const validConversations = conversations.filter(conv => {
          return typeof conv === 'object' && 
            conv !== null && 
            typeof conv.id === 'string' &&
            !('initiatedByInboxId' in conv) &&
            !('addedInboxes' in conv) &&
            !('removedInboxes' in conv) &&
            !('metadataFieldChanges' in conv);
        });
        
        // Find the group in the valid conversations
        let foundGroup = validConversations.find(
          (conv) => conv.id === groupId,
        ) as Group | undefined;

        if (foundGroup) {
          console.log("Found group in existing conversations:", foundGroup.id);
          // Make sure the group data is refreshed
          await foundGroup.sync();
          if (foundGroup.isActive) {
            setGroupConversation(foundGroup);
            
            try {
              // Fetch members and messages
              const members = await foundGroup.members();
              setGroupMemberCount(members.length);
              
              const messages = await foundGroup.messages();
              setGroupMessageCount(messages.length);
            } catch (contentError) {
              console.error("Error fetching group content:", contentError);
            }
          }
        } else if (isMember && client && groupId) {
          console.log("Not found in conversations but is a member, refreshing...");
          // If we're a member but don't have the conversation locally, 
          // refresh the conversation list
          try {
            await client.conversations.sync();
            const newConversations = await client.conversations.list();
            
            // Filter the refreshed conversations
            const validNewConversations = newConversations.filter(conv => {
              return typeof conv === 'object' && 
                conv !== null && 
                typeof conv.id === 'string' &&
                !('initiatedByInboxId' in conv) &&
                !('addedInboxes' in conv) &&
                !('removedInboxes' in conv) &&
                !('metadataFieldChanges' in conv);
            });
            
            setConversations(validNewConversations);
            
            // Try to find the group again after refresh
            foundGroup = validNewConversations.find(
              (conv) => conv.id === groupId,
            ) as Group | undefined;
            
            if (foundGroup) {
              console.log("Found group after refresh:", foundGroup.id);
              
              // Verify the group is actually a Group object with expected properties
              if (typeof foundGroup.id === 'string' && typeof foundGroup.isActive !== 'undefined') {
                setGroupConversation(foundGroup);
                
                try {
                  // Fetch members and messages
                  const members = await foundGroup.members();
                  setGroupMemberCount(members.length);
                  
                  const messages = await foundGroup.messages();
                  setGroupMessageCount(messages.length);
                } catch (contentError) {
                  console.error("Error fetching group content after refresh:", contentError);
                }
              } else {
                console.error("Found item is not a valid Group object:", foundGroup);
                setGroupConversation(null);
              }
            } else {
              console.log("Group not found after refresh");
              setGroupConversation(null);
            }
          } catch (error) {
            console.error("Error refreshing conversations:", error);
            throw new Error("Failed to refresh conversations");
          }
        }
      } catch (groupError) {
        console.error("Error processing group:", groupError);
        setGroupConversation(null);
      }
    } catch (error) {
      console.error("Error fetching group ID:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to fetch group ID");
    } finally {
      setIsRefreshing(false);
      setHasAttemptedRefresh(true);
    }
  }, [
    client,
    conversations,
    isRefreshing,
    setConversations,
  ]);

  // Fetch group when client is available
  useEffect(() => {
    let isMounted = true;
    
    const fetchGroupOnce = async () => {
      if (client && !isRefreshing && isMounted) {
        console.log("Client is ready, attempting to fetch group");
        await handleFetchGroupId();
      }
    };
    
    if (client && !hasAttemptedRefresh) {
      fetchGroupOnce();
    }
    
    return () => {
      isMounted = false;
    };
  }, [client, handleFetchGroupId, isRefreshing, hasAttemptedRefresh]);

  // Leave group handler
  const handleLeaveGroup = async () => {
    if (!client) return;

    try {
      setJoining(true);
      setErrorMessage(null);
      
      const response = await fetch(`/api/proxy/remove-inbox`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inboxId: client.inboxId,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();

      if (data.success) {
        // Successfully left the group - refresh conversations
        await client.conversations.sync();
        const newConversations = await client.conversations.list();
        setConversations(newConversations);
        setIsGroupJoined(false);
        setGroupConversation(null);
        setHasAttemptedRefresh(false);
        setGroupMemberCount(0);
        setGroupMessageCount(0);
      } else {
        console.warn("Failed to leave group", data);
        throw new Error(data.message || "Failed to leave group");
      }
    } catch (error) {
      console.error("Error leaving group", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to leave group");
    } finally {
      setJoining(false);
    }
  };

  // Join group handler
  const handleJoinGroup = async () => {
    if (!client) return;

    try {
      setJoining(true);
      setErrorMessage(null);
      
      const response = await fetch(`/api/proxy/add-inbox`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inboxId: client.inboxId,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Join group response:", data);

      if (data.success) {
        try {
          // Clear any potential outdated state immediately
          setGroupConversation(null);
          
          // Add a delay before refreshing to allow XMTP network updates to propagate
          console.log("Successfully joined group. Waiting before refreshing...");
          
          setTimeout(async () => {
            try {
              // Successfully joined the group - refresh conversations and fetch group data
              await client.conversations.sync();
              const newConversations = await client.conversations.list();
              console.log("After joining: updated conversations list", newConversations.length);
              
              // Filter out any update objects that might have been returned
              const validConversations = newConversations.filter(conv => {
                // Check if conv is a valid conversation with expected properties
                return typeof conv === 'object' && 
                  conv !== null && 
                  typeof conv.id === 'string' &&
                  !('initiatedByInboxId' in conv) &&
                  !('addedInboxes' in conv) &&
                  !('removedInboxes' in conv) &&
                  !('metadataFieldChanges' in conv);
              });
              
              setConversations(validConversations);
              
              // Wait a bit more before fetching group data
              setTimeout(async () => {
                await handleFetchGroupId();
              }, 1000);
            } catch (syncError) {
              console.error("Error syncing after join:", syncError);
            }
          }, 2000);
        } catch (syncError) {
          console.error("Error syncing after join:", syncError);
          throw new Error("Failed to sync conversations after joining");
        }
      } else {
        console.warn("Failed to join group", data);
        throw new Error(data.message || "Failed to join group");
      }
    } catch (error) {
      console.error("Error joining group", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to join group");
    } finally {
      setJoining(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      // Set reconnect disabled to prevent auto-reconnection
      setReconnectDisabled(true);
      setErrorMessage(null);

      // Call logout API to clear auth cookie
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

      // Reset all state
      setConnectionType("");
      setIsGroupJoined(false);
      setGroupConversation(null);
      setHasAttemptedRefresh(false);
      setGroupMemberCount(0);
      setGroupMessageCount(0);
      setBackendInfo(null);

      // Disconnect from services
      disconnectXmtp();
      disconnect();

      // Force a hard page refresh to reset all state completely
      window.location.href = window.location.origin;
    } catch (error) {
      console.error("Error logging out:", error);
      setErrorMessage("Failed to logout properly");
    }
  };

  // Manual refresh handler
  const handleManualRefresh = async () => {
    if (!client) return;
    
    try {
      setIsRefreshing(true);
      setErrorMessage(null);
      setHasAttemptedRefresh(false); // Reset this flag to force a full refresh
      setBackendInfo(null); // Clear backend info to ensure we get fresh data
      
      console.log("Manual refresh requested");
      
      // Sync all conversations
      await client.conversations.sync();
      const newConversations = await client.conversations.list();
      setConversations(newConversations);
      console.log("Refreshed conversations:", newConversations.length);
      
      // Re-fetch group information
      await handleFetchGroupId();
    } catch (error) {
      console.error("Error refreshing data:", error);
      setErrorMessage("Failed to refresh data");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <SafeAreaContainer insets={insets}>
      <div className="flex flex-col gap-0 pb-1 w-full max-w-md mx-auto h-screen bg-black transition-all duration-300">
        <Header 
          isConnected={isConnected || (!!client && connectionType === "Ephemeral Wallet")} 
          onLogout={isConnected || (!!client && connectionType === "Ephemeral Wallet") ? () => void handleLogout() : undefined} 
        />
        {initializing ? (
          <FullPageLoader />
        ) : (
          <div className="flex flex-col gap-4 px-4 py-4 h-full overflow-auto">
            {/* Connection Status Box */}
            <div className="w-full bg-gray-900 p-3 rounded-md">
              <div className="flex justify-between items-center">
                <h2 className="text-white text-sm font-medium">Connection Status</h2>
                {client && (
                  <Button
                    size="sm"
                    variant="outline" 
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                    className="h-7 text-xs">
                    {isRefreshing ? "..." : "Refresh"}
                  </Button>
                )}
              </div>
              <div className="text-gray-400 text-xs mt-1">
                <p><span className="text-gray-500">Connected:</span> {isConnected ? "Yes" : "No"}</p>
                <p><span className="text-gray-500">Type:</span> {connectionType || "Not connected"}</p>
                <p><span className="text-gray-500">Address:</span> {
                  connectionType === "Ephemeral Wallet" && ephemeralAddress 
                    ? `${ephemeralAddress}` 
                    : address 
                      ? `${address}` 
                      : "None"
                }</p>
                {client && <p><span className="text-gray-500">XMTP:</span> <span className="text-green-500">Connected</span></p>}
              </div>
            </div>
            
            {/* XMTP Client Info - Show when client exists */}
            {client && (
              <div className="w-full bg-gray-900 p-3 rounded-md">
                <div className="flex justify-between items-center">
                  <h2 className="text-white text-sm font-medium">XMTP Client</h2>
                  <Button
                    size="sm"
                    variant="outline" 
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                    className="h-7 text-xs">
                    {isRefreshing ? "..." : "Refresh"}
                  </Button>
                </div>
                <div className="text-gray-400 text-xs mt-1">
                  <p><span className="text-gray-500">Environment:</span> {env.NEXT_PUBLIC_XMTP_ENV}</p>
                  <p><span className="text-gray-500">Inbox ID:</span> {client.inboxId ? `${client.inboxId.slice(0, 6)}...${client.inboxId.slice(-6)}` : "None"}</p>
                  <p><span className="text-gray-500">Conversations:</span> {conversations.length}</p>
                </div>
              </div>
            )}
            
            {/* Authentication Buttons */}
            {!client ? (
              <div className="w-full flex flex-col gap-3 mt-2">
                <Button 
                  className="w-full" 
                  size="lg" 
                  onClick={connectWithEOA}>
                  Connect with EOA Wallet
                </Button>
                
                <Button 
                  className="w-full" 
                  size="lg" 
                  onClick={connectWithEphemeral}>
                  Connect with Ephemeral Wallet
                </Button>
                
                <Button 
                  className="w-full" 
                  size="lg" 
                  onClick={connectWithSCW}>
                  Connect with Smart Contract Wallet
                </Button>
              </div>
            ) : (
              <>
                {/* Group Status Section */}
                <div className="w-full bg-gray-900 p-3 rounded-md">
                  <div className="flex justify-between items-center">
                    <h2 className="text-white text-sm font-medium">Group Status</h2>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline" 
                        onClick={handleManualRefresh}
                        disabled={isRefreshing}
                        className="h-7 text-xs">
                        {isRefreshing ? "..." : "Refresh"}
                      </Button>
                    </div>
                  </div>
                  <div className="text-gray-400 text-xs mt-1">
                    <p>
                      <span className="text-gray-500">Status:</span> 
                      {!client ? (
                        <span className="text-yellow-500"> Not connected</span>
                      ) : isRefreshing ? (
                        <span className="text-yellow-500"> Refreshing...</span>
                      ) : joining ? (
                        <span className="text-yellow-500"> Processing...</span>
                      ) : isGroupJoined ? (
                        <span className="text-green-500"> Member</span>
                      ) : (
                        <span className="text-red-500"> Not a member</span>
                      )}
                    </p>
                    {isGroupJoined ? (
                      <>
                        <p><span className="text-gray-500">Group Name:</span> {
                          groupConversation && typeof groupConversation === 'object' && 'name' in groupConversation 
                            ? (typeof groupConversation.name === 'string' ? groupConversation.name : "XMTP Mini app") 
                            : "XMTP Mini app"
                        }</p>
                        {groupConversation && typeof groupConversation === 'object' && 'id' in groupConversation && typeof groupConversation.id === 'string' && (
                          <>
                            <p><span className="text-gray-500">Group ID:</span> {groupConversation.id.slice(0, 8)}...{groupConversation.id.slice(-8)}</p>
                            <p><span className="text-gray-500">Active:</span> {
                              'isActive' in groupConversation && typeof groupConversation.isActive === 'boolean'
                                ? (groupConversation.isActive ? "Yes" : "No")
                                : "Unknown"
                            }</p>
                          </>
                        )}
                        <p><span className="text-gray-500">Members:</span> {groupMemberCount}</p>
                        <p><span className="text-gray-500">Messages:</span> {groupMessageCount}</p>
                      </>
                    ) : null}
                  </div>
                  <Button
                    className="w-full mt-3"
                    size="sm"
                    variant={joining || isRefreshing ? "outline" : "default"}
                    onClick={isGroupJoined ? handleLeaveGroup : handleJoinGroup}
                    disabled={joining || isRefreshing || !client}>
                    {joining 
                      ? "Processing..." 
                      : isRefreshing
                        ? "Refreshing..."
                        : isGroupJoined 
                          ? `Leave Group${
                              groupConversation && typeof groupConversation === 'object' && 'name' in groupConversation && typeof groupConversation.name === 'string' 
                                ? `: ${groupConversation.name}` 
                                : ""
                            }` 
                          : "Join Group Chat"}
                  </Button>
                </div>
                
                {/* Backend Server Info Section */}
                {client && backendInfo && typeof backendInfo === 'object' && (
                  <div className="w-full bg-gray-900 p-3 rounded-md">
                    <div className="flex justify-between items-center">
                      <h2 className="text-white text-sm font-medium">Backend Server Info</h2>
                      <Button
                        size="sm"
                        variant="outline" 
                        onClick={handleManualRefresh}
                        disabled={isRefreshing}
                        className="h-7 text-xs">
                        {isRefreshing ? "..." : "Refresh"}
                      </Button>
                    </div>
                    <div className="text-gray-400 text-xs mt-1">
                      <p><span className="text-gray-500">Server Group ID:</span> {
                        backendInfo.groupId && typeof backendInfo.groupId === 'string' 
                          ? `${backendInfo.groupId.slice(0, 8)}...${backendInfo.groupId.slice(-8)}` 
                          : "None"
                      }</p>
                      <p><span className="text-gray-500">Group Name:</span> {
                        backendInfo.groupName && typeof backendInfo.groupName === 'string' 
                          ? backendInfo.groupName 
                          : "Unnamed Group"
                      }</p>
                      <p><span className="text-gray-500">Total Members:</span> {
                        typeof backendInfo.memberCount === 'number' 
                          ? backendInfo.memberCount 
                          : 0
                      }</p>
                      <p><span className="text-gray-500">Total Messages:</span> {
                        typeof backendInfo.messageCount === 'number' 
                          ? backendInfo.messageCount 
                          : 0
                      }</p>
                      
                      {/* Last message display */}
                      {backendInfo.lastMessage && typeof backendInfo.lastMessage === 'object' && (
                        <div className="mt-2 p-2 bg-gray-800 rounded-md">
                          <p className="text-sm font-medium text-gray-300">Last Message</p>
                          <p className="text-xs text-green-400">{
                            backendInfo.lastMessage.displaySenderId && typeof backendInfo.lastMessage.displaySenderId === 'string'
                              ? backendInfo.lastMessage.displaySenderId
                              : "Unknown sender"
                          }</p>
                          <p className="text-xs text-white mt-1">{
                            backendInfo.lastMessage.content && typeof backendInfo.lastMessage.content === 'string'
                              ? backendInfo.lastMessage.content
                              : "No content"
                          }</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {backendInfo.lastMessage.sentAt && typeof backendInfo.lastMessage.sentAt === 'string'
                              ? new Date(backendInfo.lastMessage.sentAt).toLocaleString()
                              : "Unknown time"
                            }
                          </p>
                        </div>
                      )}
                      
                      {/* Members list collapsible */}
                      {backendInfo.members && Array.isArray(backendInfo.members) && backendInfo.members.length > 0 && (
                        <details className="mt-2">
                          <summary className="text-sm font-medium text-gray-300 cursor-pointer">
                            Members ({backendInfo.members.length})
                          </summary>
                          <ul className="mt-1 ml-2">
                            {backendInfo.members.map((member, index) => (
                              typeof member === 'object' && member !== null ? (
                                <li key={index} className="text-xs flex items-center gap-2">
                                  <span className="text-gray-400">{
                                    member.displayInboxId && typeof member.displayInboxId === 'string'
                                      ? member.displayInboxId
                                      : "Unknown member"
                                  }</span>
                                  {member.isAdmin === true && <span className="text-xs text-blue-400">Admin</span>}
                                  {member.isSuperAdmin === true && <span className="text-xs text-purple-400">Super Admin</span>}
                                </li>
                              ) : null
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
            
            {/* Error Message */}
            {errorMessage && (
              <div className="text-red-500 text-sm mt-2 p-2 bg-red-900/20 rounded-md">
                {errorMessage}
              </div>
            )}
          </div>
        )}
      </div>
    </SafeAreaContainer>
  );
}

// Dynamically import the page component with SSR disabled
const PageWithNoSSR = dynamic(
  () => 
    import("@/context/frame-context").then((mod) => {
      // Create a wrapper component that safely gets the frame context
      function FrameWrapper() {
        const frameContext = mod.useFrame();
        // Important: We pass the frame context as a prop, not using it directly inside
        return <InnerPageComponent frameContext={frameContext} />;
      }
      
      return FrameWrapper;
    }),
  { ssr: false }
);

// Export the dynamic component as the default
export default function Page() {
  return <PageWithNoSSR />;
}