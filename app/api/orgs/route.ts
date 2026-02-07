import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

// POST /api/orgs — Create an organisation
export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session || session.entity_type !== "human") {
    return NextResponse.json(
      { error: "You must be signed in as a verified human to create an organisation." },
      { status: 401 }
    );
  }

  const body = await request.json();
  const { name, handle, domain, description, website_url, linkedin_company_url } = body;

  if (!name || !handle) {
    return NextResponse.json(
      { error: "Organisation name and handle are required." },
      { status: 400 }
    );
  }

  // Validate handle format
  const cleanHandle = handle.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (cleanHandle.length < 2 || cleanHandle.length > 40) {
    return NextResponse.json(
      { error: "Handle must be 2-40 characters (letters, numbers, hyphens, underscores)." },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Check handle isn't taken
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("handle", cleanHandle)
    .single();

  if (existing) {
    return NextResponse.json({ error: "That handle is already taken." }, { status: 409 });
  }

  // Check if creator is LinkedIn-verified → auto-verify the org
  const { data: creator } = await supabase
    .from("profiles")
    .select("verification_status, verification_method")
    .eq("id", session.profile_id)
    .single();

  const creatorIsVerified = creator?.verification_status === "verified" && creator?.verification_method === "linkedin";

  // Create the org profile
  const { data: org, error: createError } = await supabase
    .from("profiles")
    .insert({
      entity_type: "org",
      handle: cleanHandle,
      display_name: name,
      bio: description || null,
      domain: domain || null,
      website_url: website_url || null,
      linkedin_url: linkedin_company_url || null,
      verification_status: creatorIsVerified ? "verified" : "unverified",
      verified_at: creatorIsVerified ? new Date().toISOString() : null,
      verification_method: creatorIsVerified ? "linkedin_creator" : null,
      verification_payload: creatorIsVerified
        ? { verified_by: session.profile_id, method: "linkedin_verified_creator" }
        : {},
      skills: [],
      tier: "new",
    })
    .select()
    .single();

  if (createError) {
    console.error("Failed to create org:", createError);
    return NextResponse.json({ error: "Failed to create organisation." }, { status: 500 });
  }

  // Create affiliation: creator → org (works_at, auto-confirmed)
  const { error: affError } = await supabase
    .from("affiliations")
    .insert({
      parent_id: org.id,           // org is the parent
      child_id: session.profile_id, // human is the child
      affiliation_type: "works_at",
      status: "active",
      role_title: "Founder",
      parent_confirmed: true,
      child_confirmed: true,
    });

  if (affError) {
    console.error("Failed to create affiliation:", affError);
    // Org was created, affiliation failed — not a showstopper
  }

  return NextResponse.json({
    success: true,
    org,
    message: `Organisation "${name}" created! Visit /profile/${cleanHandle} to see it.`,
  });
}

// GET /api/orgs — List orgs (public)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

  const supabase = createServerClient();
  const { data: orgs, error } = await supabase
    .from("profiles")
    .select("id, handle, display_name, bio, avatar_url, domain, website_url, verification_status, created_at")
    .eq("entity_type", "org")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch orgs" }, { status: 500 });
  }

  return NextResponse.json({ orgs });
}
