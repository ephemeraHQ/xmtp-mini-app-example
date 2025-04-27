"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type BackendStatus = "unknown" | "online" | "offline";

interface BackendHealthContextValue {
  backendStatus: BackendStatus;
  checkBackendHealth: () => Promise<boolean>;
}

// Create context with default values
export const BackendHealthContext = createContext<BackendHealthContextValue>({
  backendStatus: "unknown",
  checkBackendHealth: async () => false,
});

// Hook to use the backend health context
export const useBackendHealth = () => useContext(BackendHealthContext);

interface BackendHealthProviderProps {
  children: React.ReactNode;
  pollingInterval?: number; // in milliseconds
}

export const BackendHealthProvider: React.FC<BackendHealthProviderProps> = ({ 
  children,
  pollingInterval = 30000 // Default to 30 seconds
}) => {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>("unknown");
  
  const checkBackendHealth = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/proxy/health');
      
      // Make sure we got a proper response
      if (!response.ok) {
        setBackendStatus("offline");
        return false;
      }
      
      const data = await response.json();
      const isOnline = data.backend === "online";
      setBackendStatus(isOnline ? "online" : "offline");
      return isOnline;
    } catch (error) {
      setBackendStatus("offline");
      return false;
    }
  };

  // Check initially and set up polling
  useEffect(() => {
    // Check immediately on mount
    checkBackendHealth();

    // Set up interval for regular checks
    const intervalId = setInterval(checkBackendHealth, pollingInterval);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [pollingInterval]);

  return (
    <BackendHealthContext.Provider value={{ backendStatus, checkBackendHealth }}>
      {children}
    </BackendHealthContext.Provider>
  );
}; 