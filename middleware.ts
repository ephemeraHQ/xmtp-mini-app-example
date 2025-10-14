import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/api/:path*"],
};

export default async function middleware(req: NextRequest) {
  // Simple middleware - no authentication required
  // Allow all API requests to pass through
  return NextResponse.next();
}
