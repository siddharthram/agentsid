import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

interface RouteParams {
  params: { handle: string };
}

// GET /api/profiles/[handle]/endorsements
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { handle } = params;
  const { searchParams } = new URL(request.url);
  const direction = searchParams.get("direction") || "received";
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

  try {
    // Get profile ID
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("handle", handle.toLowerCase())
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    let query = supabase
      .from("profile_endorsements")
      .select(`
        *,
        endorser:profiles!endorser_id(id, handle, display_name, avatar_url, entity_type, tier),
        endorsed:profiles!endorsed_id(id, handle, display_name, avatar_url, entity_type, tier)
      `);

    if (direction === "given") {
      query = query.eq("endorser_id", profile.id);
    } else {
      query = query.eq("endorsed_id", profile.id);
    }

    const { data: endorsements, error } = await query
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({ endorsements: endorsements || [] });
  } catch (error) {
    console.error("Error fetching endorsements:", error);
    return NextResponse.json(
      { error: "Failed to fetch endorsements" },
      { status: 500 }
    );
  }
}
