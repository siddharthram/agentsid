import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/agents - List agents or get by handle
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const handle = searchParams.get("handle");
  const tier = searchParams.get("tier");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  try {
    let query = supabase
      .from("agents")
      .select(`
        *,
        endorsements_received:endorsements!to_agent_id(count),
        endorsements_given:endorsements!from_agent_id(count)
      `)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by handle if provided
    if (handle) {
      query = query.eq("moltbook_handle", handle).single();
    }

    // Filter by reputation tier
    if (tier) {
      query = query.eq("reputation_tier", tier);
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching agents:", error);
    return NextResponse.json(
      { error: "Failed to fetch agents" },
      { status: 500 }
    );
  }
}
