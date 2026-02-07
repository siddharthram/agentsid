import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

// POST /api/orgs/verify-email — Verify an org using the emailed code
export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session || session.entity_type !== "human") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { org_handle, code } = await request.json();

  if (!org_handle || !code) {
    return NextResponse.json({ error: "org_handle and code are required" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Get the org
  const { data: org } = await supabase
    .from("profiles")
    .select("*")
    .eq("handle", org_handle)
    .eq("entity_type", "org")
    .single();

  if (!org) {
    return NextResponse.json({ error: "Organisation not found" }, { status: 404 });
  }

  // Find valid, unused verification code
  const { data: verification } = await supabase
    .from("email_verifications")
    .select("*")
    .eq("org_id", org.id)
    .eq("code", code.trim())
    .eq("used", false)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!verification) {
    return NextResponse.json(
      { error: "Invalid or expired code. Request a new one." },
      { status: 400 }
    );
  }

  // Mark code as used
  await supabase
    .from("email_verifications")
    .update({ used: true })
    .eq("id", verification.id);

  // Upgrade org verification — domain email is stronger than linkedin_creator
  const newMethod = org.verification_method === "dns" ? "dns" : "domain_email";
  
  await supabase
    .from("profiles")
    .update({
      verification_status: "verified",
      verified_at: new Date().toISOString(),
      verification_method: newMethod,
      verification_payload: {
        ...((org.verification_payload as Record<string, unknown>) || {}),
        email_verified: verification.email,
        email_verified_at: new Date().toISOString(),
        email_verified_by: session.profile_id,
      },
    })
    .eq("id", org.id);

  return NextResponse.json({
    success: true,
    message: `Organisation "${org.display_name}" verified via ${verification.email}!`,
    verification_method: newMethod,
  });
}
