import { NextResponse } from "next/server";

export async function POST() {
  // Create a response
  const response = NextResponse.json({ success: true }, { status: 200 });

  // Clear the auth_token cookie by setting it to expire immediately
  response.cookies.set({
    name: "auth_token",
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 0, // Expire immediately
    path: "/",
  });

  return response;
}
