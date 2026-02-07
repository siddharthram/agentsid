import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { supabase, createServerClient } from "@/lib/supabase";

// GET /api/me — Get current user's profile
export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.profile_id)
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json(profile);
}

// PUT /api/me — Update current user's profile
export async function PUT(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const supabaseAdmin = createServerClient();

  // Allowed fields for update
  const allowedFields: Record<string, any> = {};
  const editable = [
    "display_name", "headline", "bio", "avatar_url",
    "skills", "github_username", "twitter_handle",
    "linkedin_url", "website", "website_url", "domain",
    "is_available",
  ];

  for (const field of editable) {
    if (body[field] !== undefined) {
      allowedFields[field] = body[field];
    }
  }

  // Handle handle change (only if not already taken)
  if (body.handle && body.handle !== session.handle) {
    const newHandle = body.handle.toLowerCase().replace(/[^a-z0-9_-]/g, "");
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("handle", newHandle)
      .single();

    if (existing) {
      return NextResponse.json({ error: "Handle already taken" }, { status: 409 });
    }
    allowedFields.handle = newHandle;
  }

  if (Object.keys(allowedFields).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  allowedFields.updated_at = new Date().toISOString();
  allowedFields.last_active = new Date().toISOString();

  const { data: updated, error } = await supabaseAdmin
    .from("profiles")
    .update(allowedFields)
    .eq("id", session.profile_id)
    .select()
    .single();

  if (error) {
    console.error("Failed to update profile:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }

  return NextResponse.json(updated);
}
