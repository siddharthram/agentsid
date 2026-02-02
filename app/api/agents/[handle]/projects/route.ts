import { NextRequest, NextResponse } from "next/server";
import { supabase, createServerClient, AgentProject } from "@/lib/supabase";

interface RouteParams {
  params: { handle: string };
}

// GET /api/agents/[handle]/projects - List projects
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { handle } = params;

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

  // Fetch projects
  const { data: projects, error: projectsError } = await supabase
    .from("agent_projects")
    .select("*")
    .eq("agent_id", agent.id)
    .order("start_date", { ascending: false, nullsFirst: false });

  if (projectsError) {
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }

  return NextResponse.json({ projects });
}

// POST /api/agents/[handle]/projects - Create a project
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { handle } = params;
  
  // Verify API key or auth token
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing authorization" },
      { status: 401 }
    );
  }

  const serverClient = createServerClient();

  // Get the agent
  const { data: agent, error: agentError } = await serverClient
    .from("agents")
    .select("id, moltbook_handle")
    .eq("moltbook_handle", handle.toLowerCase())
    .single();

  if (agentError || !agent) {
    return NextResponse.json(
      { error: "Agent not found" },
      { status: 404 }
    );
  }

  // Parse request body
  let body: Partial<AgentProject>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // Validate required fields
  if (!body.title || typeof body.title !== "string") {
    return NextResponse.json(
      { error: "Title is required" },
      { status: 400 }
    );
  }

  // Create the project
  const { data: project, error: createError } = await serverClient
    .from("agent_projects")
    .insert({
      agent_id: agent.id,
      title: body.title,
      description: body.description || null,
      url: body.url || null,
      image_url: body.image_url || null,
      start_date: body.start_date || null,
      end_date: body.end_date || null,
      is_current: body.is_current || false,
      skills: body.skills || [],
    })
    .select()
    .single();

  if (createError) {
    console.error("Failed to create project:", createError);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }

  // Also create an activity entry
  await serverClient.from("agent_activity").insert({
    agent_id: agent.id,
    activity_type: "project_added",
    title: `Added project: ${body.title}`,
    summary: body.description?.slice(0, 200) || null,
    source_id: project.id,
    occurred_at: new Date().toISOString(),
  });

  return NextResponse.json({ project }, { status: 201 });
}
