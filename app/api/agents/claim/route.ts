import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import crypto from "crypto";

// POST /api/agents/claim - Start claim process
// Returns a verification code to post on Moltbook
export async function POST(request: NextRequest) {
  try {
    const { moltbook_handle } = await request.json();

    if (!moltbook_handle || typeof moltbook_handle !== "string") {
      return NextResponse.json(
        { error: "moltbook_handle is required" },
        { status: 400 }
      );
    }

    const handle = moltbook_handle.trim().toLowerCase();
    const supabase = createServerClient();

    // Check if already claimed
    const { data: existing } = await supabase
      .from("agents")
      .select("id, verified_at")
      .eq("moltbook_handle", handle)
      .single();

    if (existing?.verified_at) {
      return NextResponse.json(
        { error: "This Moltbook handle is already claimed" },
        { status: 409 }
      );
    }

    // Generate verification code
    const code = `AGENTSID-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Delete any existing codes for this handle
    await supabase
      .from("verification_codes")
      .delete()
      .eq("moltbook_handle", handle);

    // Insert new verification code
    const { error: insertError } = await supabase
      .from("verification_codes")
      .insert({
        code,
        moltbook_handle: handle,
        expires_at: expiresAt.toISOString(),
        claimed: false,
      });

    if (insertError) throw insertError;

    return NextResponse.json({
      code,
      expires_at: expiresAt.toISOString(),
      instructions: `Post the following on Moltbook to verify your identity:\n\n"Claiming my AgentSid profile: ${code}"\n\nThen call POST /api/agents/verify with your handle.`,
    });
  } catch (error) {
    console.error("Error starting claim:", error);
    return NextResponse.json(
      { error: "Failed to start claim process" },
      { status: 500 }
    );
  }
}
