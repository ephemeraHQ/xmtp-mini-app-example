"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { DecodedMessage, Conversation, Client, Dm } from "@xmtp/browser-sdk";
import { Button } from "@/components/Button";
import { useXMTP } from "@/context/xmtp-context";

// Bot address - replace with the actual bot address you want to use
const BOT_ADDRESS = "0x20b572be48527a770479744aec6fe5644f97678b";


export default function BotChat() {
  const { client } = useXMTP();
  
  // State
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [botConversation, setBotConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<DecodedMessage[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [streamActive, setStreamActive] = useState(false);
  
  // Use ref to track if stream is already started to prevent infinite loops
  const streamStartedRef = useRef(false);

  // Initialize the conversation with the bot
  const initializeConversation = useCallback(async () => {
    if (!client) return;
    let botConversation: Conversation | null = null;
    setIsConnecting(true);
    try {
        botConversation = await client.conversations.newDmWithIdentifier({
            identifier: BOT_ADDRESS,
           identifierKind: "Ethereum"
        });
        setBotConversation(botConversation);
    } catch (error) {
      console.error("Error initializing bot conversation:", error);
    } finally {
      setIsConnecting(false);
    }
  }, [client]);
  
  // Start a stream to listen for new messages
  const startMessageStream = useCallback(async () => {
    // Prevent double initialization and infinite loops
    if (!client || !botConversation || streamActive || streamStartedRef.current) return;
    
    try {
      console.log("Starting message stream for bot conversation");
      // Set flag before state to prevent race conditions
      streamStartedRef.current = true;
      setStreamActive(true);
      
      const streamPromise = botConversation.stream();
      const stream = await streamPromise;
      
      // Handle the stream with for await...of loop
      const streamMessages = async () => {
        try {
          for await (const message of stream) {
            console.log("Received message:", message);
            // Ensure we don't add undefined to the messages array
            if (message) {
              setMessages((prevMessages) => [...prevMessages, message]);
            }
          }
        } catch (error) {
          console.error("Error in message stream:", error);
          setStreamActive(false);
          streamStartedRef.current = false;
        }
      };
      
      // Start listening for messages
      streamMessages();
      
      // Return a cleanup function
      return () => {
        if (stream && typeof stream.return === 'function') {
          stream.return(undefined);
        }
        setStreamActive(false);
        streamStartedRef.current = false;
      };
    } catch (error) {
      console.error("Error starting message stream:", error);
      setStreamActive(false);
      streamStartedRef.current = false;
      return undefined;
    }
  }, [client, botConversation, streamActive]);
  
  // Initialize conversation when client is available
  useEffect(() => {
    if (client && !botConversation && !isConnecting) {
      initializeConversation();
    }
  }, [client, botConversation, isConnecting, initializeConversation]);

  // Start stream when conversation is available
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    
    // Only start the stream if we have a conversation and the stream isn't already active
    if (client && botConversation && !streamActive && !streamStartedRef.current) {
      startMessageStream().then(cleanupFn => {
        cleanup = cleanupFn;
      });
    }
    
    // Clean up when component unmounts or dependencies change
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [client, botConversation, streamActive, startMessageStream]);

  // Send message to the bot
  const handleSendMessage = async () => {
    if (!client || !botConversation || !message.trim()) return;

    setSending(true);
    
    try {
      // Send the message to the bot
      await botConversation.send(message);
      
      // Clear input
      setMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

 

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="w-full bg-gray-900 p-3 rounded-md">
        <div className="flex justify-between items-center">
          <h2 className="text-white text-sm font-medium">Bot Chat</h2>
          <div className="flex items-center">
            <div className={`h-2 w-2 rounded-full mr-2 ${streamActive ? "bg-green-500" : "bg-red-500"}`} />
            <span className="text-xs text-gray-400">{streamActive ? "Stream active" : "Stream inactive"}</span>
          </div>
        </div>
        
        {!client ? (
          <p className="text-gray-400 text-xs mt-2">Connect your wallet to chat with the bot</p>
        ) : isConnecting ? (
          <p className="text-yellow-500 text-xs mt-2">Connecting to bot...</p>
        ) : !botConversation ? (
          <div className="mt-2">
            <Button 
              size="sm" 
              variant="default" 
              onClick={initializeConversation} 
              disabled={isConnecting}
              className="w-full"
            >
              Connect to Bot
            </Button>
          </div>
        ) : (
          <>
            {/* Message history */}
            <div className="mt-2 border border-gray-800 rounded-md p-2 max-h-40 overflow-y-auto">
              {messages.length === 0 ? (
                <p className="text-gray-500 text-xs">No messages yet. Send a message to get started!</p>
              ) : (
                messages.map((msg, index) => {
                  // Get sender address safely
                  const senderAddress = BOT_ADDRESS; 
                  
                  // Get client address
                  const clientAddress = client.inboxId;
                  
                  // Get message sent time safely
                  const sentTime = msg.sentAtNs ? new Date(Number(msg.sentAtNs) / 1000000) : new Date();
                  
                  return (
                    <div key={index} className={`mb-2 text-xs ${
                      senderAddress === clientAddress ? "text-right" : "text-left"
                    }`}>
                      <div className={`inline-block px-2 py-1 rounded-md ${
                        senderAddress === clientAddress 
                          ? "bg-blue-900 text-white" 
                          : "bg-gray-800 text-gray-200"
                      }`}>
                        <p>{String(msg.content)}</p>
                        <p className="text-[10px] mt-1 opacity-60">
                          {sentTime.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            {/* Message input */}
            <div className="mt-2 flex">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Say something to the bot..."
                className="flex-1 bg-gray-800 text-white text-sm rounded-l-md px-3 py-2 outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !sending) {
                    handleSendMessage();
                  }
                }}
              />
              <Button
                size="sm"
                variant="default"
                onClick={handleSendMessage}
                disabled={sending || !message.trim()}
                className="rounded-l-none"
              >
                {sending ? "Sending..." : "Send"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 