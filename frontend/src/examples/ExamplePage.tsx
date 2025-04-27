import { Header } from "@/components/Header";
import { SafeAreaContainer } from "@/components/SafeAreaContainer";
import { FullPageLoader } from "@/components/FullPageLoader";
import { useXMTP } from "@/context/xmtp-context";
import { useAccount } from "wagmi";
import { ConnectionInfo } from ".";
import { WalletConnection } from ".";
import { GroupManagement } from ".";
import { BackendInfo } from ".";
import { LogoutButton } from ".";

export default function ExamplePage() {
  const { client, initializing } = useXMTP();
  const { isConnected } = useAccount();

  return (
    <SafeAreaContainer>
      <div className="flex flex-col gap-0 pb-1 w-full max-w-md mx-auto h-screen bg-black transition-all duration-300">
        <Header 
          isConnected={isConnected || !!client} 
          onLogout={isConnected || !!client ? () => {} : undefined} 
        />
        {initializing ? (
          <FullPageLoader />
        ) : (
          <div className="flex flex-col gap-4 px-4 py-4 h-full overflow-auto">
            {/* Connection Info Example */}
            <ConnectionInfo />
            
            {/* Wallet Connection Example (show only when not connected) */}
            {!client && (
              <WalletConnection />
            )}
            
            {/* Group Management (show when connected) */}
            {client && (
              <GroupManagement />
            )}
            
            {/* Backend Info (show when connected) */}
            {client && (
              <BackendInfo />
            )}
            
            {/* Logout Button (show when connected) */}
            {(isConnected || !!client) && (
              <LogoutButton />
            )}
          </div>
        )}
      </div>
    </SafeAreaContainer>
  );
} 