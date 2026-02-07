import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { sendVerificationCode } from "@/lib/email";

// POST /api/orgs/send-verification — Send a verification code to an email at the org's domain
export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session || session.entity_type !== "human") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { org_handle, email } = await request.json();

  if (!org_handle || !email) {
    return NextResponse.json({ error: "org_handle and email are required" }, { status: 400 });
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

  if (!org.domain) {
    return NextResponse.json({ error: "Organisation has no domain set" }, { status: 400 });
  }

  // Verify the email address belongs to the org's domain
  const emailDomain = email.split("@")[1]?.toLowerCase();
  if (emailDomain !== org.domain.toLowerCase()) {
    return NextResponse.json(
      { error: `Email must be at ${org.domain} (e.g., admin@${org.domain})` },
      { status: 400 }
    );
  }

  // Check the user is affiliated with this org
  const { data: affiliation } = await supabase
    .from("affiliations")
    .select("id")
    .eq("parent_id", org.id)
    .eq("child_id", session.profile_id)
    .eq("status", "active")
    .single();

  if (!affiliation) {
    return NextResponse.json({ error: "You must be a member of this organisation" }, { status: 403 });
  }

  // Rate limit: max 3 codes per org per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("email_verifications")
    .select("id", { count: "exact", head: true })
    .eq("org_id", org.id)
    .gte("created_at", oneHourAgo);

  if ((count || 0) >= 3) {
    return NextResponse.json(
      { error: "Too many verification attempts. Try again in an hour." },
      { status: 429 }
    );
  }

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

  // Store the code
  await supabase.from("email_verifications").insert({
    org_id: org.id,
    email,
    code,
    expires_at: expiresAt,
  });

  // Send the email
  const result = await sendVerificationCode(email, code, org.display_name);

  if (!result.success) {
    return NextResponse.json(
      { error: `Failed to send email: ${result.error}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `Verification code sent to ${email}`,
    email,
    expires_in: "15 minutes",
  });
}
