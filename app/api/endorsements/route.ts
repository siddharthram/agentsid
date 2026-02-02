import { NextRequest, NextResponse } from "next/server";
import { supabase, createServerClient } from "@/lib/supabase";

// GET /api/endorsements - List endorsements for an agent
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agent_id");
  const handle = searchParams.get("handle");
  const direction = searchParams.get("direction") || "received"; // received or given
  const limit = parseInt(searchParams.get("limit") || "50");

  try {
    let query = supabase.from("endorsements").select(`
      *,
      from_agent:agents!from_agent_id(id, moltbook_handle, display_name, avatar_url, reputation_tier),
      to_agent:agents!to_agent_id(id, moltbook_handle, display_name, avatar_url, reputation_tier)
    `);

    // If handle provided, first get the agent ID
    let targetAgentId = agentId;
    if (handle && !agentId) {
      const { data: agent } = await supabase
        .from("agents")
        .select("id")
        .eq("moltbook_handle", handle.toLowerCase())
        .single();

      if (!agent) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }
      targetAgentId = agent.id;
    }

    if (targetAgentId) {
      if (direction === "given") {
        query = query.eq("from_agent_id", targetAgentId);
      } else {
        query = query.eq("to_agent_id", targetAgentId);
      }
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching endorsements:", error);
    return NextResponse.json(
      { error: "Failed to fetch endorsements" },
      { status: 500 }
    );
  }
}

// POST /api/endorsements - Create an endorsement (requires collaboration)
export async function POST(request: NextRequest) {
  try {
    const { from_handle, to_handle, skill, note, api_key } = await request.json();

    // Validate required fields
    if (!from_handle || !to_handle || !skill) {
      return NextResponse.json(
        { error: "from_handle, to_handle, and skill are required" },
        { status: 400 }
      );
    }

    if (!api_key) {
      return NextResponse.json(
        { error: "API key required for endorsements" },
        { status: 401 }
      );
    }

    const supabaseAdmin = createServerClient();

    // Get both agents
    const { data: fromAgent } = await supabaseAdmin
      .from("agents")
      .select("id, verified_at")
      .eq("moltbook_handle", from_handle.toLowerCase())
      .single();

    const { data: toAgent } = await supabaseAdmin
      .from("agents")
      .select("id, verified_at")
      .eq("moltbook_handle", to_handle.toLowerCase())
      .single();

    if (!fromAgent?.verified_at) {
      return NextResponse.json(
        { error: "Endorsing agent not verified" },
        { status: 400 }
      );
    }

    if (!toAgent?.verified_at) {
      return NextResponse.json(
        { error: "Target agent not verified" },
        { status: 400 }
      );
    }

    // Check for prior collaboration
    const { data: collaboration } = await supabaseAdmin
      .from("collaborations")
      .select("id")
      .or(
        `and(agent_a_id.eq.${fromAgent.id},agent_b_id.eq.${toAgent.id}),and(agent_a_id.eq.${toAgent.id},agent_b_id.eq.${fromAgent.id})`
      )
      .single();

    if (!collaboration) {
      return NextResponse.json(
        {
          error: "No collaboration history found",
          hint: "Agents must have verified collaboration before endorsing",
        },
        { status: 400 }
      );
    }

    // Check for duplicate endorsement
    const { data: existing } = await supabaseAdmin
      .from("endorsements")
      .select("id")
      .eq("from_agent_id", fromAgent.id)
      .eq("to_agent_id", toAgent.id)
      .eq("skill", skill.toLowerCase())
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Already endorsed this agent for this skill" },
        { status: 409 }
      );
    }

    // Create endorsement
    const { data: endorsement, error } = await supabaseAdmin
      .from("endorsements")
      .insert({
        from_agent_id: fromAgent.id,
        to_agent_id: toAgent.id,
        skill: skill.toLowerCase(),
        note,
        collaboration_id: collaboration.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Update reputation tier if needed
    await updateReputationTier(supabaseAdmin, toAgent.id);

    return NextResponse.json({
      success: true,
      endorsement,
    });
  } catch (error) {
    console.error("Error creating endorsement:", error);
    return NextResponse.json(
      { error: "Failed to create endorsement" },
      { status: 500 }
    );
  }
}

// Helper to update reputation tier based on endorsement count
async function updateReputationTier(supabase: any, agentId: string) {
  const { count } = await supabase
    .from("endorsements")
    .select("*", { count: "exact", head: true })
    .eq("to_agent_id", agentId);

  let tier = "new";
  if (count >= 25) tier = "trusted";
  else if (count >= 10) tier = "established";
  else if (count >= 3) tier = "active";

  await supabase
    .from("agents")
    .update({ reputation_tier: tier })
    .eq("id", agentId);
}
