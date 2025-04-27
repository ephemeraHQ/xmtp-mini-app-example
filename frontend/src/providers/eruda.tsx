"use client";

import eruda from "eruda";
import { ReactNode, useEffect, createContext, useContext, useState } from "react";
import { env } from "@/lib/env";

// Create context for Eruda
type ErudaContextType = {
  isVisible: boolean;
  toggleEruda: () => void;
};

const ErudaContext = createContext<ErudaContextType | undefined>(undefined);

// Hook to use Eruda context
export const useEruda = () => {
  const context = useContext(ErudaContext);
  if (!context) {
    throw new Error("useEruda must be used within an ErudaProvider");
  }
  return context;
};

// Original Eruda component implementation
const ErudaImpl = (props: { children: ReactNode }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        // Add CSS to hide the entry button
        const style = document.createElement('style');
        style.textContent = '.eruda-entry-btn { display: none !important; visibility: hidden !important; }';
        document.head.appendChild(style);
        
        // Setup a mutation observer to remove the entry button whenever it appears
        const observer = new MutationObserver((mutations) => {
          const entryBtn = document.querySelector('.eruda-entry-btn');
          if (entryBtn && entryBtn.parentNode) {
            entryBtn.parentNode.removeChild(entryBtn);
          }
        });
        
        // Start observing the document body for DOM changes
        observer.observe(document.body, { 
          childList: true,
          subtree: true 
        });
        
        // Initialize but don't show by default
        eruda.init({
          autoScale: true,
          useShadowDom: true,
          tool: ['console', 'elements', 'network', 'resources', 'info']
        });
        eruda.hide();
        
        // Initial removal attempt
        const entryBtn = document.querySelector('.eruda-entry-btn');
        if (entryBtn && entryBtn.parentNode) {
          entryBtn.parentNode.removeChild(entryBtn);
        }
        
        // Clean up observer on unmount
        return () => {
          observer.disconnect();
          document.head.removeChild(style);
        };
      } catch (error) {
        console.log("Eruda failed to initialize", error);
      }
    }
  }, []);

  const toggleEruda = () => {
    if (typeof window !== "undefined") {
      try {
        if (isVisible) {
          eruda.hide();
        } else {
          eruda.show();
          // Try to activate console tab by default when showing
          try {
            const devTools = eruda.get('console');
            if (devTools && typeof devTools.show === 'function') {
              devTools.show();
            }
          } catch (err) {
            // Ignore if this method doesn't exist
          }
        }
        setIsVisible(!isVisible);
      } catch (error) {
        console.log("Error toggling Eruda:", error);
      }
    }
  };

  return (
    <ErudaContext.Provider value={{ isVisible, toggleEruda }}>
      {props.children}
    </ErudaContext.Provider>
  );
};

// Exported provider that includes environment check
export const ErudaProvider = (props: { children: ReactNode }) => {
  if (env.NEXT_PUBLIC_APP_ENV === "production") {
    return props.children;
  }
  return <ErudaImpl>{props.children}</ErudaImpl>;
};
