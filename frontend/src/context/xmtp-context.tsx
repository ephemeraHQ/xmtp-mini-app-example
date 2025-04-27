import {
  Client,
  Conversation,
  type ClientOptions,
  type Signer,
  Group,
} from "@xmtp/browser-sdk";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

// Type definitions
export type InitializeClientOptions = {
  dbEncryptionKey?: Uint8Array;
  env?: ClientOptions["env"];
  loggingLevel?: ClientOptions["loggingLevel"];
  signer: Signer;
};

export type XMTPContextValue = {
  client?: Client;
  setClient: React.Dispatch<React.SetStateAction<Client | undefined>>;
  initialize: (options: InitializeClientOptions) => Promise<Client | undefined>;
  initializing: boolean;
  error: Error | null;
  disconnect: () => void;
  conversations: Conversation[];
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  groupConversation: Group | null;
  setGroupConversation: React.Dispatch<React.SetStateAction<Group | null>>;
};

export type XMTPProviderProps = React.PropsWithChildren & {
  client?: Client;
};

// Storage keys for localStorage
const STORAGE_KEYS = {
  HAS_CONNECTED: "xmtp:hasConnected",
};

// Create context with default values
export const XMTPContext = createContext<XMTPContextValue>({
  setClient: () => {},
  initialize: () => Promise.reject(new Error("XMTPProvider not available")),
  initializing: false,
  error: null,
  disconnect: () => {},
  conversations: [],
  setConversations: () => {},
  groupConversation: null,
  setGroupConversation: () => {},
});

// Logger utility for consistent logging
const logger = {
  log: (message: string, data?: any) => {
    if (data) {
      console.log(`XMTP: ${message}`, data);
    } else {
      console.log(`XMTP: ${message}`);
    }
  },
  error: (message: string, error?: any) => {
    console.error(`XMTP Error: ${message}`, error);
  },
};

// Storage utility for safely interacting with localStorage
const storage = {
  set: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      logger.error(`Failed to set localStorage item: ${key}`, e);
      return false;
    }
  },
  remove: (key: string) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      logger.error(`Failed to remove localStorage item: ${key}`, e);
      return false;
    }
  },
  clearXMTPItems: () => {
    try {
      storage.remove(STORAGE_KEYS.HAS_CONNECTED);
      
      let removedCount = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("xmtp.")) {
          localStorage.removeItem(key);
          removedCount++;
        }
      }
      
      return removedCount;
    } catch (e) {
      logger.error("Failed to clear XMTP items", e);
      return 0;
    }
  },
};

export const XMTPProvider: React.FC<XMTPProviderProps> = ({
  children,
  client: initialClient,
}) => {
  // State
  const [client, setClient] = useState<Client | undefined>(initialClient);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [groupConversation, setGroupConversation] = useState<Group | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Debug logging on mount
  useEffect(() => {
    logger.log("Provider mounted");
  }, []);

  // Reset conversations when client changes
  useEffect(() => {
    logger.log("Client changed", { exists: !!client });
    if (!client) {
      setConversations([]);
    }
  }, [client]);

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
      logger.log("Initialize called with options", { 
        hasDBEncryptionKey: !!dbEncryptionKey, 
        env,
        loggingLevel,
        hasSigner: !!signer
      });
      
      // Don't initialize if client exists
      if (client) {
        logger.log("Client already exists, returning existing client");
        return client;
      }

      // Don't proceed if already initializing (prevents double sign requests)
      if (initializing) {
        logger.log("XMTP client initialization already in progress, returning undefined");
        return undefined;
      }

      // Set initializing state
      logger.log("Setting initializing state");
      setError(null);
      setInitializing(true);

      try {
        // Mark as connected in localStorage
        storage.set(STORAGE_KEYS.HAS_CONNECTED, "true");

        logger.log("Creating XMTP client...");
        
        // Create client options
        const clientOptions = {
          env,
          loggingLevel,
          dbEncryptionKey,
        };

        // Create the client
        logger.log("Calling Client.create - this will prompt for signature");
        const xmtpClient = await Client.create(signer, clientOptions);
        logger.log("XMTP client created successfully");
        
        // Perform initial sync
        logger.log("Syncing conversations...");
        await xmtpClient.conversations.sync();
        logger.log("Initial conversations sync complete");
        
        // Set the client
        logger.log("Setting client in state");
        setClient(xmtpClient);
        
        return xmtpClient;
      } catch (e) {
        logger.error("Error creating XMTP client", e);
        setClient(undefined);
        setError(e as Error);
        throw e;
      } finally {
        logger.log("Setting initializing to false");
        setInitializing(false);
      }
    },
    [client, initializing],
  );

  /**
   * Disconnect the XMTP client
   */
  const disconnect = useCallback(() => {
    logger.log("Disconnect called");
    
    if (client) {
      logger.log("Closing client");
      client.close();
      
      logger.log("Setting client to undefined");
      setClient(undefined);
      setConversations([]);
      setError(null);
      
      // Clear XMTP storage
      const removedCount = storage.clearXMTPItems();
      logger.log(`Removed ${removedCount} XMTP-specific localStorage items`);
    } else {
      logger.log("No client to disconnect");
    }
  }, [client]);

  // Create context value
  const value = useMemo<XMTPContextValue>(
    () => ({
      client,
      setClient,
      initialize,
      initializing,
      error,
      disconnect,
      conversations,
      setConversations,
      groupConversation,
      setGroupConversation,
    }),
    [client, initialize, initializing, error, disconnect, conversations, groupConversation],
  );

  return <XMTPContext.Provider value={value}>{children}</XMTPContext.Provider>;
};

export const useXMTP = () => useContext(XMTPContext);