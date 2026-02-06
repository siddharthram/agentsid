import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { createServerClient } from "@/lib/supabase";

// GET /api/auth/linkedin/callback — LinkedIn OAuth callback
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

  // Handle errors from LinkedIn
  if (error) {
    const errorDesc = searchParams.get("error_description") || "Authentication failed";
    return NextResponse.redirect(`${appUrl}/join?error=${encodeURIComponent(errorDesc)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/join?error=Missing+code+or+state`);
  }

  // Verify state matches cookie
  const storedState = request.cookies.get("linkedin_oauth_state")?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${appUrl}/join?error=Invalid+state`);
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID!;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET!;
  const jwtSecret = process.env.JWT_SECRET!;
  const redirectUri = `${appUrl}/api/auth/linkedin/callback`;

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("LinkedIn token exchange failed:", err);
      return NextResponse.redirect(`${appUrl}/join?error=Token+exchange+failed`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch user profile from LinkedIn (OpenID Connect userinfo)
    const userInfoRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userInfoRes.ok) {
      console.error("LinkedIn userinfo failed:", await userInfoRes.text());
      return NextResponse.redirect(`${appUrl}/join?error=Failed+to+fetch+profile`);
    }

    const userInfo = await userInfoRes.json();

    // userInfo contains: sub, name, given_name, family_name, picture, email, email_verified
    const linkedinId = userInfo.sub;
    const displayName = userInfo.name || `${userInfo.given_name || ""} ${userInfo.family_name || ""}`.trim();
    const email = userInfo.email;
    const avatarUrl = userInfo.picture;

    // 3. Check if profile already exists for this LinkedIn ID
    const supabase = createServerClient();

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("linkedin_id", linkedinId)
      .single();

    let profileId: string;
    let handle: string;

    if (existingProfile) {
      // Returning user — update last_active
      profileId = existingProfile.id;
      handle = existingProfile.handle;

      await supabase
        .from("profiles")
        .update({
          last_active: new Date().toISOString(),
          avatar_url: avatarUrl || existingProfile.avatar_url,
        })
        .eq("id", profileId);
    } else {
      // New user — create profile
      // Generate handle from name (lowercase, no spaces, add random suffix if conflict)
      const baseHandle = displayName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .substring(0, 20);

      // Check for handle conflicts
      const { data: handleCheck } = await supabase
        .from("profiles")
        .select("handle")
        .eq("handle", baseHandle)
        .single();

      handle = handleCheck
        ? `${baseHandle}${Math.floor(Math.random() * 999)}`
        : baseHandle;

      const { data: newProfile, error: createError } = await supabase
        .from("profiles")
        .insert({
          entity_type: "human",
          handle,
          display_name: displayName,
          avatar_url: avatarUrl,
          email,
          linkedin_id: linkedinId,
          linkedin_url: `https://www.linkedin.com/in/${linkedinId}`,
          verification_status: "verified",
          verified_at: new Date().toISOString(),
          verification_method: "linkedin",
          verification_payload: { sub: linkedinId, email_verified: userInfo.email_verified },
          platform: null, // humans don't have a platform
          skills: [],
          tier: "new",
        })
        .select()
        .single();

      if (createError) {
        console.error("Failed to create profile:", createError);
        return NextResponse.redirect(`${appUrl}/join?error=Failed+to+create+profile`);
      }

      profileId = newProfile!.id;
    }

    // 4. Create JWT session token
    const token = jwt.sign(
      {
        profile_id: profileId,
        entity_type: "human",
        handle,
        verified: true,
      },
      jwtSecret,
      { expiresIn: "30d" }
    );

    // 5. Set session cookie and redirect to profile
    const response = NextResponse.redirect(`${appUrl}/profile/${handle}`);

    response.cookies.set("agentsid_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    // Clear the OAuth state cookie
    response.cookies.delete("linkedin_oauth_state");

    return response;
  } catch (err) {
    console.error("LinkedIn OAuth error:", err);
    return NextResponse.redirect(`${appUrl}/join?error=Authentication+failed`);
  }
}
