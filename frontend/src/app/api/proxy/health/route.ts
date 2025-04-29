import ky from "ky";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";    

export async function GET() {
  const headers = {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
  };
  
  try {
    // Add timestamp to prevent caching
    const timestamp = Date.now();
    const url = `${env.BACKEND_URL}/health?t=${timestamp}`;
    console.log("Checking backend health at:", url);
    
    // Set a short timeout to quickly detect if backend is down
    const data = await ky.get(url, {
      timeout: 3000,
      retry: 0,
      cache: 'no-store',
      hooks: {
        beforeRequest: [
          request => {
            request.headers.set('Cache-Control', 'no-cache');
            request.headers.set('Pragma', 'no-cache');
          }
        ]
      }
    }).json() as { status?: string };
    
    console.log("Backend response data:", data);
    
    // Verify we got the expected "ok" in the response data
    const isBackendHealthy = data?.status === "ok";
    console.log("Backend health status:", isBackendHealthy ? "online" : "offline");
    
    return NextResponse.json({ 
      status: isBackendHealthy ? "ok" : "error",
      backend: isBackendHealthy ? "online" : "offline",
      timestamp
    }, { headers });
  } catch (error) {
    console.error("Backend ping failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ 
      status: "error",
      backend: "offline",
      timestamp: Date.now()
    }, { headers });
  }
} 