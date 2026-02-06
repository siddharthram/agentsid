import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// GET /api/auth/linkedin — Start LinkedIn OAuth flow
export async function GET(request: NextRequest) {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

  if (!clientId) {
    return NextResponse.json(
      { error: "LinkedIn OAuth not configured" },
      { status: 500 }
    );
  }

  // Generate state for CSRF protection
  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = `${appUrl}/api/auth/linkedin/callback`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: "openid profile email",
  });

  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;

  // Set state in cookie for verification in callback
  const response = NextResponse.redirect(authUrl);
  response.cookies.set("linkedin_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  return response;
}
