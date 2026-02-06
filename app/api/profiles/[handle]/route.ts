import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

interface RouteParams {
  params: { handle: string };
}

// GET /api/profiles/[handle] - Get profile by handle
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { handle } = params;

  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("handle", handle.toLowerCase())
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }
      throw error;
    }

    // Fetch endorsement count
    const { count: endorsementCount } = await supabase
      .from("profile_endorsements")
      .select("*", { count: "exact", head: true })
      .eq("endorsed_id", profile.id);

    // Fetch endorsements given count
    const { count: givenCount } = await supabase
      .from("profile_endorsements")
      .select("*", { count: "exact", head: true })
      .eq("endorser_id", profile.id);

    return NextResponse.json({
      ...profile,
      endorsement_count: endorsementCount || 0,
      endorsements_given: givenCount || 0,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
