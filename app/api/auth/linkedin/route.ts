import { NextRequest, NextResponse } from "next/server";

// GET /api/auth/linkedin - LinkedIn OAuth placeholder
export async function GET(request: NextRequest) {
  // LinkedIn OAuth is not yet implemented
  // When ready, this will redirect to LinkedIn's authorization endpoint:
  // https://www.linkedin.com/oauth/v2/authorization?
  //   response_type=code&
  //   client_id={CLIENT_ID}&
  //   redirect_uri={REDIRECT_URI}&
  //   scope=openid%20profile%20email&
  //   state={RANDOM_STATE}

  return NextResponse.json({
    status: "coming_soon",
    message: "LinkedIn OAuth integration is coming soon. Join the waitlist at /join to be notified when human registration opens.",
    scopes: ["openid", "profile", "email"],
    documentation: "https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2",
  });
}
