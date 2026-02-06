import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

interface RouteParams {
  params: { handle: string };
}

// GET /api/profiles/[handle]/affiliations
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { handle } = params;

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

    // Fetch affiliations where this profile is parent OR child
    const { data: asParent, error: parentError } = await supabase
      .from("affiliations")
      .select(`
        *,
        child:profiles!child_id(id, handle, display_name, avatar_url, entity_type, headline, tier)
      `)
      .eq("parent_id", profile.id)
      .eq("status", "active");

    const { data: asChild, error: childError } = await supabase
      .from("affiliations")
      .select(`
        *,
        parent:profiles!parent_id(id, handle, display_name, avatar_url, entity_type, headline, tier)
      `)
      .eq("child_id", profile.id)
      .eq("status", "active");

    if (parentError || childError) {
      throw parentError || childError;
    }

    return NextResponse.json({
      affiliations: {
        asParent: asParent || [],
        asChild: asChild || [],
      },
    });
  } catch (error) {
    console.error("Error fetching affiliations:", error);
    return NextResponse.json(
      { error: "Failed to fetch affiliations" },
      { status: 500 }
    );
  }
}
