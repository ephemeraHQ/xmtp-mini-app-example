import {
  Client,
  Conversation,
  type ClientOptions,
  type Signer,
} from "@xmtp/browser-sdk";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type InitializeClientOptions = {
  dbEncryptionKey?: Uint8Array;
  env?: ClientOptions["env"];
  loggingLevel?: ClientOptions["loggingLevel"];
  signer: Signer;
};

export type XMTPContextValue = {
  /**
   * The XMTP client instance
   */
  client?: Client;
  /**
   * Set the XMTP client instance
   */
  setClient: React.Dispatch<React.SetStateAction<Client | undefined>>;
  initialize: (options: InitializeClientOptions) => Promise<Client | undefined>;
  initializing: boolean;
  error: Error | null;
  disconnect: () => void;
  conversations: Conversation[];
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
};

export const XMTPContext = createContext<XMTPContextValue>({
  setClient: () => {},
  initialize: () => Promise.reject(new Error("XMTPProvider not available")),
  initializing: false,
  error: null,
  disconnect: () => {},
  conversations: [],
  setConversations: () => {},
});

export type XMTPProviderProps = React.PropsWithChildren & {
  /**
   * Initial XMTP client instance
   */
  client?: Client;
};

// Constants for local storage keys
const XMTP_HAS_CONNECTED_KEY = "xmtp:hasConnected";
const XMTP_CONNECTION_TYPE_KEY = "xmtp:connectionType";
const XMTP_EPHEMERAL_KEY = "xmtp:ephemeralKey";

export const XMTPProvider: React.FC<XMTPProviderProps> = ({
  children,
  client: initialClient,
}) => {
  const [client, setClient] = useState<Client | undefined>(initialClient);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [initializing, setInitializing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  // client is initializing
  const initializingRef = useRef(false);

  // Debug logging on mount
  useEffect(() => {
    console.log("XMTPProvider mounted");
    
    // Log the state of the XMTP-specific localStorage
    try {
      const hasConnected = localStorage.getItem(XMTP_HAS_CONNECTED_KEY);
      const connectionType = localStorage.getItem(XMTP_CONNECTION_TYPE_KEY);
      const hasEphemeralKey = !!localStorage.getItem(XMTP_EPHEMERAL_KEY);
      
      console.log("XMTP localStorage state:", {
        hasConnected,
        connectionType,
        hasEphemeralKey,
        clientExists: !!client
      });
      
      // Log all XMTP-related keys
      const xmtpKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("xmtp.") || key.startsWith("xmtp:"))) {
          xmtpKeys.push(key);
        }
      }
      console.log("All XMTP localStorage keys:", xmtpKeys);
      
    } catch (err) {
      console.error("Error accessing localStorage:", err);
    }
  }, [client]);

  // Reset conversations when client changes or becomes undefined
  useEffect(() => {
    console.log("Client changed:", !!client);
    if (!client) {
      setConversations([]);
    }
  }, [client]);

  // Check for stored connection on first render
  useEffect(() => {
    const checkExistingConnection = async () => {
      try {
        const hasConnected = localStorage.getItem(XMTP_HAS_CONNECTED_KEY);
        console.log("Checking for existing connection:", { hasConnected });
        
        // If the user has connected before, we'll show the initializing state
        // even if we fail to auto-connect, to give a better UX
        if (hasConnected === "true") {
          console.log("User has connected before, setting initializing state");
          setInitializing(true);
          
          // Add a timeout to reset initializing after a reasonable period
          // This prevents the UI from getting stuck in loading state
          setTimeout(() => {
            if (!client) {
              console.log("Auto-connection timed out, resetting initializing state");
              setInitializing(false);
            }
          }, 15000); // 15 seconds should be enough for connection
        }
      } catch (err) {
        console.error("Error checking localStorage:", err);
      }
    };
    
    checkExistingConnection();
  }, []);

  // Log state changes
  useEffect(() => {
    console.log("XMTP context state:", { 
      initializing, 
      hasClient: !!client, 
      hasError: !!error,
      conversationsCount: conversations.length
    });
  }, [initializing, client, error, conversations.length]);

  /**
   * Initialize an XMTP client
   */
  const initialize = useCallback(
    async ({
      dbEncryptionKey,
      env,
      loggingLevel,
      signer,
    }: InitializeClientOptions) => {
      console.log("Initialize called with options:", { 
        hasDBEncryptionKey: !!dbEncryptionKey, 
        env,
        loggingLevel,
        hasSigner: !!signer
      });
      
      // only initialize a client if one doesn't already exist
      if (!client) {
        // if the client is already initializing, don't do anything
        if (initializingRef.current) {
          console.log("Client is already initializing, skipping");
          return undefined;
        }

        // flag the client as initializing
        initializingRef.current = true;
        console.log("Setting initializing state");

        // reset error state
        setError(null);
        // reset initializing state
        setInitializing(true);

        let xmtpClient: Client;

        try {
          // Perform local storage test
          localStorage.setItem("XMTP_TEST", "test");
          const test = localStorage.getItem("XMTP_TEST");
          if (test !== "test") {
            console.error("localStorage not working properly");
          } else {
            console.log("localStorage working properly");
            
            // Store that we've connected in localStorage for persistence
            localStorage.setItem(XMTP_HAS_CONNECTED_KEY, "true");
            console.log("Set hasConnected flag in localStorage");
          }
          localStorage.removeItem("XMTP_TEST");
        } catch (error) {
          console.error("Error accessing localStorage:", error);
        }

        try {
          console.log("Creating XMTP client...");
          // create a new XMTP client
          xmtpClient = await Client.create(signer, {
            env,
            loggingLevel,
            dbEncryptionKey,
          });
          console.log("XMTP client created successfully");
          
          console.log("Syncing conversations...");
          await xmtpClient.conversations.sync();
          console.log("Conversations synced");
          
          console.log("Setting client in state");
          setClient(xmtpClient);
          return xmtpClient;
        } catch (e) {
          console.error("Error creating XMTP client:", e);
          setClient(undefined);
          setError(e as Error);
          // re-throw error for upstream consumption
          throw e;
        } finally {
          console.log("Setting initializing to false");
          initializingRef.current = false;
          setInitializing(false);
        }
      }
      console.log("Client already exists, returning existing client");
      return client;
    },
    [client],
  );

  const disconnect = useCallback(() => {
    console.log("Disconnect called");
    if (client) {
      console.log("Closing client");
      client.close();
      console.log("Setting client to undefined");
      setClient(undefined);
      // Also clear conversations when disconnecting
      setConversations([]);
      // Reset any error state
      setError(null);
      
      // Clear XMTP connection info from localStorage
      try {
        console.log("Clearing XMTP localStorage items");
        localStorage.removeItem(XMTP_HAS_CONNECTED_KEY);
        localStorage.removeItem(XMTP_CONNECTION_TYPE_KEY);
        localStorage.removeItem(XMTP_EPHEMERAL_KEY);
        
        // Clear any XMTP-specific local storage items
        let removedKeys = 0;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("xmtp.")) {
            localStorage.removeItem(key);
            removedKeys++;
          }
        }
        console.log(`Removed ${removedKeys} XMTP-specific localStorage items`);
      } catch (err) {
        console.error("Error clearing localStorage:", err);
      }
    } else {
      console.log("No client to disconnect");
    }
  }, [client, setClient, setConversations]);

  // memo-ize the context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      client,
      setClient,
      initialize,
      initializing,
      error,
      disconnect,
      conversations,
      setConversations,
    }),
    [client, initialize, initializing, error, disconnect, conversations],
  );

  return <XMTPContext.Provider value={value}>{children}</XMTPContext.Provider>;
};

export const useXMTP = () => {
  return useContext(XMTPContext);
};
