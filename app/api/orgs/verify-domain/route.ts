import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { resolve } from "dns/promises";

// POST /api/orgs/verify-domain — Verify org domain via DNS TXT record
export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session || session.entity_type !== "human") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { org_handle } = await request.json();
  if (!org_handle) {
    return NextResponse.json({ error: "org_handle is required" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Get the org
  const { data: org, error: orgError } = await supabase
    .from("profiles")
    .select("*")
    .eq("handle", org_handle)
    .eq("entity_type", "org")
    .single();

  if (orgError || !org) {
    return NextResponse.json({ error: "Organisation not found" }, { status: 404 });
  }

  if (!org.domain) {
    return NextResponse.json({ error: "Organisation has no domain set. Add a domain first." }, { status: 400 });
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

  // Expected TXT record: agentsid-verify=<org_handle>
  const expectedRecord = `agentsid-verify=${org.handle}`;

  try {
    const txtRecords = await resolve(org.domain, "TXT");
    // txtRecords is an array of arrays of strings
    const flat = txtRecords.flat();
    const found = flat.some((r: string) => r.trim() === expectedRecord);

    if (!found) {
      return NextResponse.json({
        success: false,
        message: `DNS TXT record not found. Add this TXT record to ${org.domain}:`,
        expected_record: expectedRecord,
        instructions: `Add a TXT record to your domain's DNS:\n  Host: @ (or ${org.domain})\n  Value: ${expectedRecord}\n  TTL: 300`,
        found_records: flat.slice(0, 10),
      });
    }

    // Verified! Update the org
    await supabase
      .from("profiles")
      .update({
        verification_status: "verified",
        verified_at: new Date().toISOString(),
        verification_method: "dns",
        verification_payload: { record: expectedRecord, verified_by: session.profile_id },
      })
      .eq("id", org.id);

    return NextResponse.json({
      success: true,
      message: `Domain ${org.domain} verified! Organisation "${org.display_name}" is now verified.`,
    });
  } catch (err: any) {
    if (err.code === "ENODATA" || err.code === "ENOTFOUND") {
      return NextResponse.json({
        success: false,
        message: `No TXT records found for ${org.domain}. Add this TXT record:`,
        expected_record: expectedRecord,
        instructions: `Add a TXT record to your domain's DNS:\n  Host: @ (or ${org.domain})\n  Value: ${expectedRecord}\n  TTL: 300`,
      });
    }
    console.error("DNS lookup error:", err);
    return NextResponse.json({ error: "DNS lookup failed" }, { status: 500 });
  }
}
