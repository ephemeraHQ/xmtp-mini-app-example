import ky from "ky";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";


export async function GET() {
  try {
    // Check backend health
    let backendStatus = "unknown";
    
    try {
      const response = await ky.get(`${env.BACKEND_URL}/health`, {
        timeout: 5000, // 5s timeout
        retry: 0, // No retries
      });
      
      if (response.ok) {
        backendStatus = "online";
      } else {
        backendStatus = "offline";
      }
    } catch (error) {
      console.error("Backend health check failed:", error);
      backendStatus = "offline";
    }
    
    return NextResponse.json({ 
      status: "ok",
      timestamp: new Date().toISOString(),
      backend: backendStatus
    });
  } catch (error) {
    console.error("Health check error");
    return NextResponse.json(
      { 
        status: "error",
        message: (error as Error).message 
      },
      { status: 500 }
    );
  }
} 