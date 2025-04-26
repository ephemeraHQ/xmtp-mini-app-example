import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Clone the request headers
  const requestHeaders = new Headers(request.headers);

  // Get the response
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Set cache control headers to prevent caching
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set("Surrogate-Control", "no-store");

  return response;
}

// Configure which paths to apply this middleware to
export const config = {
  matcher: "/((?!api/.|_next/static|_next/image|favicon.ico).*)",
};
