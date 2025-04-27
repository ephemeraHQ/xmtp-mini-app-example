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
  useRef,
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

// Constants
const STORAGE_KEYS = {
  HAS_CONNECTED: "xmtp:hasConnected",
  CONNECTION_TYPE: "xmtp:connectionType",
  EPHEMERAL_KEY: "xmtp:ephemeralKey",
  TEST: "XMTP_TEST",
};

const AUTO_TIMEOUT_MS = 15000;
const BACKGROUND_SYNC_DELAY_MS = 1000;

// Default optimization options
const DEFAULT_CLIENT_OPTIONS = {
  publishTimeoutMs: 10000,
  apiClientTimeoutMs: 10000,
};

const RECONNECTION_OPTIONS = {
  skipContactPublishing: true,
  persistConversations: true,
  maxTimeToLiveMs: 60_000,
};

const EOA_RECONNECTION_OPTIONS = {
  maxPageSize: 10,
  startSyncFromSeconds: 60 * 60 * 24 * 7, // One week
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
  warn: (message: string, data?: any) => {
    console.warn(`XMTP Warning: ${message}`, data);
  }
};

// Storage utility for safely interacting with localStorage
const storage = {
  isAvailable: () => {
    try {
      localStorage.setItem(STORAGE_KEYS.TEST, "test");
      const test = localStorage.getItem(STORAGE_KEYS.TEST);
      localStorage.removeItem(STORAGE_KEYS.TEST);
      return test === "test";
    } catch (e) {
      return false;
    }
  },
  set: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      logger.error(`Failed to set localStorage item: ${key}`, e);
      return false;
    }
  },
  get: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      logger.error(`Failed to get localStorage item: ${key}`, e);
      return null;
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
      storage.remove(STORAGE_KEYS.CONNECTION_TYPE);
      storage.remove(STORAGE_KEYS.EPHEMERAL_KEY);
      
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
  getAllXMTPKeys: () => {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("xmtp.") || key.startsWith("xmtp:"))) {
          keys.push(key);
        }
      }
      return keys;
    } catch (e) {
      logger.error("Failed to get XMTP keys", e);
      return [];
    }
  }
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
  
  // Refs
  const initializingRef = useRef(false);

  // Debug logging on mount
  useEffect(() => {
    logger.log("Provider mounted");
    
    if (storage.isAvailable()) {
      const hasConnected = storage.get(STORAGE_KEYS.HAS_CONNECTED);
      const connectionType = storage.get(STORAGE_KEYS.CONNECTION_TYPE);
      const hasEphemeralKey = !!storage.get(STORAGE_KEYS.EPHEMERAL_KEY);
      
      logger.log("localStorage state", {
        hasConnected,
        connectionType,
        hasEphemeralKey,
        clientExists: !!client
      });
      
      const xmtpKeys = storage.getAllXMTPKeys();
      logger.log("All XMTP localStorage keys", xmtpKeys);
    } else {
      logger.warn("localStorage is not available");
    }
  }, [client]);

  // Reset conversations when client changes
  useEffect(() => {
    logger.log("Client changed", { exists: !!client });
    if (!client) {
      setConversations([]);
    }
  }, [client]);

  // Check for stored connection on first render
  useEffect(() => {
    const checkExistingConnection = async () => {
      const hasConnected = storage.get(STORAGE_KEYS.HAS_CONNECTED);
      logger.log("Checking for existing connection", { hasConnected });
      
      if (hasConnected === "true") {
        logger.log("User has connected before, setting initializing state");
        setInitializing(true);
        
        // Add a timeout to reset initializing after a reasonable period
        setTimeout(() => {
          if (!client) {
            logger.log("Auto-connection timed out, resetting initializing state");
            setInitializing(false);
          }
        }, AUTO_TIMEOUT_MS);
      }
    };
    
    checkExistingConnection();
  }, []);

  // Log state changes
  useEffect(() => {
    logger.log("Context state", { 
      initializing, 
      hasClient: !!client, 
      hasError: !!error,
      conversationsCount: conversations.length
    });
  }, [initializing, client, error, conversations.length]);

  // Log groupConversation changes
  useEffect(() => {
    if (groupConversation) {
      const isGroup = !!groupConversation && typeof groupConversation.send === 'function';
      logger.log("groupConversation changed", {
        id: groupConversation.id, 
        name: groupConversation.name,
        isActive: groupConversation.isActive,
        isValidGroup: isGroup,
        hasMembers: typeof groupConversation.members === 'function',
        hasSend: typeof groupConversation.send === 'function'
      });
    } else {
      logger.log("groupConversation changed", null);
    }
  }, [groupConversation]);

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
      
      // Don't initialize if client exists or is already initializing
      if (client) {
        logger.log("Client already exists, returning existing client");
        return client;
      }
      
      if (initializingRef.current) {
        logger.log("Client is already initializing, skipping");
        return undefined;
      }

      // Set initializing state
      initializingRef.current = true;
      logger.log("Setting initializing state");
      setError(null);
      setInitializing(true);

      try {
        // Check localStorage and mark as connected
        if (storage.isAvailable()) {
          logger.log("localStorage working properly");
          storage.set(STORAGE_KEYS.HAS_CONNECTED, "true");
        }

        logger.log("Creating XMTP client...");
        
        // Create options with faster timeouts
        const clientOptions = {
          env,
          loggingLevel,
          dbEncryptionKey,
          ...DEFAULT_CLIENT_OPTIONS
        };

        // Get identifier for cached keys
        const identifier = await signer.getIdentifier();
        logger.log("Got identifier", identifier.identifier);
        
        // Optimize for reconnection if connected before
        try {
          const connectionType = storage.get(STORAGE_KEYS.CONNECTION_TYPE);
          const hasConnectedBefore = storage.get(STORAGE_KEYS.HAS_CONNECTED) === "true";
          
          if (hasConnectedBefore) {
            logger.log("This is a reconnection - optimizing client options");
            
            // Apply general reconnection optimizations
            Object.assign(clientOptions, RECONNECTION_OPTIONS);
            
            // Apply EOA-specific optimizations if applicable
            if (connectionType === "EOA Wallet") {
              logger.log("EOA reconnection - using maximum optimizations");
              Object.assign(clientOptions, EOA_RECONNECTION_OPTIONS);
            }
          }
        } catch (cacheError) {
          logger.error("Error optimizing for reconnection", cacheError);
        }
        
        // Create the client
        const xmtpClient = await Client.create(signer, clientOptions);
        logger.log("XMTP client created successfully");
        
        // Key caching is currently disabled
        logger.log("Key caching skipped for this version of the SDK");
        
        // Perform initial sync
        logger.log("Syncing conversations...");
        await xmtpClient.conversations.sync().catch(syncErr => {
          logger.warn("Initial sync error, continuing anyway", syncErr);
        });
        logger.log("Initial conversations sync complete");
        
        // Set the client
        logger.log("Setting client in state");
        setClient(xmtpClient);
        
        // Continue syncing conversations in background
        setTimeout(() => {
          void xmtpClient.conversations.sync().then(() => {
            logger.log("Full sync completed in background");
            // Update conversations list
            void xmtpClient.conversations.list()
              .then(convs => setConversations(convs))
              .catch(err => logger.error("Error listing conversations", err));
          }).catch(err => logger.warn("Background sync error", err));
        }, BACKGROUND_SYNC_DELAY_MS);
        
        return xmtpClient;
      } catch (e) {
        logger.error("Error creating XMTP client", e);
        setClient(undefined);
        setError(e as Error);
        throw e;
      } finally {
        logger.log("Setting initializing to false");
        initializingRef.current = false;
        setInitializing(false);
      }
    },
    [client],
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
      if (storage.isAvailable()) {
        const removedCount = storage.clearXMTPItems();
        logger.log(`Removed ${removedCount} XMTP-specific localStorage items`);
      }
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