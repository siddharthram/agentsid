import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

interface RouteParams {
  params: { handle: string };
}

// GET /api/agents/[handle]/activity - Paginated activity feed
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { handle } = params;
  const { searchParams } = new URL(request.url);
  
  // Pagination params
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const offset = parseInt(searchParams.get("offset") || "0");
  const type = searchParams.get("type"); // Optional filter by activity_type

  // First get the agent ID
  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("id")
    .eq("moltbook_handle", handle.toLowerCase())
    .single();

  if (agentError || !agent) {
    return NextResponse.json(
      { error: "Agent not found" },
      { status: 404 }
    );
  }

  // Build query
  let query = supabase
    .from("agent_activity")
    .select("*", { count: "exact" })
    .eq("agent_id", agent.id)
    .order("occurred_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Filter by type if specified
  if (type) {
    query = query.eq("activity_type", type);
  }

  const { data: activities, count, error: activitiesError } = await query;

  if (activitiesError) {
    console.error("Failed to fetch activity:", activitiesError);
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    activities,
    pagination: {
      total: count,
      limit,
      offset,
      hasMore: (count || 0) > offset + limit,
    },
  });
}
