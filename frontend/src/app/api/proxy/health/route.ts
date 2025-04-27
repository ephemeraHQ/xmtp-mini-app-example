import ky from "ky";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";    

export async function GET() {
  try {
    // Test if we can actually connect to the backend
    const response = await ky.get(`${env.BACKEND_URL}/health`, { 
      timeout: 3000,
      retry: 0
    }).json();
    
    // Only return online if we got a proper response from the backend
    return NextResponse.json({ 
      status: "ok",
      timestamp: new Date().toISOString(),
      backend: "online"
    });
  } catch (error) {
    // If we can't connect to the backend, return offline status
    console.error("Backend health check failed:", error instanceof Error ? error.message : String(error));
    
    return NextResponse.json({ 
      status: "error",
      timestamp: new Date().toISOString(),
      backend: "offline"
    });
  }
} 