import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

interface RouteParams {
  params: { handle: string };
}

// GET /api/profiles/[handle]/rates
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

    const { data: rates, error } = await supabase
      .from("rates")
      .select("*")
      .eq("profile_id", profile.id)
      .order("sort_order", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ rates: rates || [] });
  } catch (error) {
    console.error("Error fetching rates:", error);
    return NextResponse.json(
      { error: "Failed to fetch rates" },
      { status: 500 }
    );
  }
}
