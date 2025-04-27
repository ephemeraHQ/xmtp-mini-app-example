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

// Dynamically import the page component with SSR disabled
const PageWithNoSSR = dynamic(
  () => 
    import("@/context/frame-context").then((mod) => {
      const { useFrame } = mod;
      
      // Create the component with frame context
      function PageComponent() {
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
        const [groupConversation, setGroupConversation] = useState<Group | null>(null);
        const [hasAttemptedRefresh, setHasAttemptedRefresh] = useState(false);
        const [groupMemberCount, setGroupMemberCount] = useState(0);
        const [groupMessageCount, setGroupMessageCount] = useState(0);
        
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
                setConversations(convos);
              } catch (error) {
                console.error("Error loading conversations:", error);
              }
            };
            
            void loadConversations();
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
              return { groupId: data.groupId, isMember: data.isMember };
            };

            const { groupId, isMember } = await getGroupId();
            setIsGroupJoined(isMember);
            console.log(`Group membership status: ${isMember ? "Member" : "Not a member"}, Group ID: ${groupId || "none"}`);

            // First try to find the group in existing conversations
            let foundGroup = conversations.find(
              (conv) => conv.id === groupId,
            ) as Group | undefined;

            if (foundGroup) {
              console.log("Found group in existing conversations:", foundGroup.id);
              // Make sure the group data is refreshed
              await foundGroup.sync();
              if (foundGroup.isActive) {
                setGroupConversation(foundGroup);
                
                // Fetch members and messages
                const members = await foundGroup.members();
                setGroupMemberCount(members.length);
                
                const messages = await foundGroup.messages();
                setGroupMessageCount(messages.length);
              }
            } else if (isMember && client && groupId) {
              console.log("Not found in conversations but is a member, refreshing...");
              // If we're a member but don't have the conversation locally, 
              // refresh the conversation list
              try {
                await client.conversations.sync();
                const newConversations = await client.conversations.list();
                setConversations(newConversations);
                
                // Try to find the group again after refresh
                foundGroup = newConversations.find(
                  (conv) => conv.id === groupId,
                ) as Group | undefined;
                
                if (foundGroup) {
                  console.log("Found group after refresh:", foundGroup.id);
                  setGroupConversation(foundGroup);
                  
                  // Fetch members and messages
                  const members = await foundGroup.members();
                  setGroupMemberCount(members.length);
                  
                  const messages = await foundGroup.messages();
                  setGroupMessageCount(messages.length);
                }
              } catch (error) {
                console.error("Error refreshing conversations:", error);
                throw new Error("Failed to refresh conversations");
              }
            } else if (!isMember) {
              console.log("Not a member of the group, clearing group data");
              // Make sure we clear group data if we're not a member
              setGroupConversation(null);
              setGroupMemberCount(0);
              setGroupMessageCount(0);
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

            if (data.success) {
              // Successfully joined the group - refresh conversations and fetch group data
              await client.conversations.sync();
              const newConversations = await client.conversations.list();
              setConversations(newConversations);
              await handleFetchGroupId();
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

        return (
          <SafeAreaContainer insets={insets}>
            <div className="flex flex-col gap-0 pb-1 w-full max-w-md mx-auto h-screen bg-black transition-all duration-300">
              <Header isConnected={isConnected} onLogout={isConnected ? () => void handleLogout() : undefined} />
              {initializing ? (
                <FullPageLoader />
              ) : (
                <div className="flex flex-col gap-4 px-4 py-4 h-full">
                  <div className="w-full bg-gray-900 p-3 rounded-md">
                    <h2 className="text-white text-sm font-medium">Connection Status</h2>
                    <div className="text-gray-400 text-xs mt-1">
                      <p><span className="text-gray-500">Connected:</span> {isConnected ? "Yes" : "No"}</p>
                      <p><span className="text-gray-500">Type:</span> {connectionType || "Not connected"}</p>
                      <p><span className="text-gray-500">Address:</span> {
                        connectionType === "Ephemeral Wallet" && ephemeralAddress 
                          ? `${ephemeralAddress.slice(0, 6)}...${ephemeralAddress.slice(-4)}` 
                          : address 
                            ? `${address.slice(0, 6)}...${address.slice(-4)}` 
                            : "None"
                      }</p>
                      {client && <p><span className="text-gray-500">XMTP:</span> <span className="text-green-500">Connected</span></p>}
                    </div>
                  </div>
                  
                  {/* XMTP Client Info - Show when client exists */}
                  {client && (
                    <div className="w-full bg-gray-900 p-3 rounded-md">
                      <h2 className="text-white text-sm font-medium">XMTP Client</h2>
                      <div className="text-gray-400 text-xs mt-1">
                        <p><span className="text-gray-500">Environment:</span> {env.NEXT_PUBLIC_XMTP_ENV}</p>
                        <p><span className="text-gray-500">Inbox ID:</span> {client.inboxId ? `${client.inboxId.slice(0, 6)}...${client.inboxId.slice(-6)}` : "None"}</p>
                        <p><span className="text-gray-500">Conversations:</span> {conversations.length}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Authentication Buttons */}
                  <div className="w-full flex flex-col gap-3 mt-2">
                    {!client ? (
                      <>
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
                      </>
                    ) : (
                      <>
                        {/* Group Chat Button */}
                        <Button
                          className="w-full"
                          size="lg"
                          variant={client ? "default" : "outline"}
                          onClick={isGroupJoined ? handleLeaveGroup : handleJoinGroup}
                          disabled={joining || isRefreshing || !client}>
                          {joining 
                            ? "Processing..." 
                            : isRefreshing
                              ? "Refreshing..."
                              : isGroupJoined 
                                ? `Leave Group${groupConversation?.name ? `: ${groupConversation.name}` : ""}` 
                                : "Join Group Chat"}
                          {!client && <span className="ml-2 text-gray-500 text-xs">(Connect first)</span>}
                        </Button>
                        
                        {/* Group Status Section */}
                        <div className="w-full bg-gray-900 p-3 rounded-md mt-2">
                          <div className="flex justify-between items-center">
                            <h2 className="text-white text-sm font-medium">Group Status</h2>
                            {client && !isRefreshing && (
                              <span 
                                className={`text-xs px-2 py-1 rounded ${isGroupJoined ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
                                {isGroupJoined ? 'Member' : 'Not Joined'}
                              </span>
                            )}
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
                                <p><span className="text-gray-500">Group Name:</span> {groupConversation?.name || "XMTP Mini app"}</p>
                                {groupConversation && (
                                  <>
                                    <p><span className="text-gray-500">Group ID:</span> {groupConversation.id.slice(0, 8)}...{groupConversation.id.slice(-8)}</p>
                                    <p><span className="text-gray-500">Active:</span> {groupConversation.isActive ? "Yes" : "No"}</p>
                                  </>
                                )}
                                <p><span className="text-gray-500">Members:</span> {groupMemberCount}</p>
                                <p><span className="text-gray-500">Messages:</span> {groupMessageCount}</p>
                              </>
                            ) : null}
                            {client && !isGroupJoined && !isRefreshing && !joining && (
                              <p className="text-gray-400 mt-2">Click &quot;Join Group Chat&quot; to join the conversation.</p>
                            )}
                          </div>
                        </div>
                        
                        {/* Refresh Button */}
                        <Button
                          className="w-full"
                          size="lg"
                          variant={isRefreshing ? "outline" : "default"}
                          onClick={handleManualRefresh}
                          disabled={isRefreshing || !client}>
                          {isRefreshing ? "Refreshing..." : "Refresh Data"}
                        </Button>
                      </>
                    )}
                  </div>
                  
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

      return PageComponent;
    }),
  { ssr: false }
);

// Export the dynamic component as the default
export default function Page() {
  return <PageWithNoSSR />;
}