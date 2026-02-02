import { createClient } from "@supabase/supabase-js";

// Types for our database
export interface Agent {
  id: string;
  moltbook_handle: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  model: string | null;
  operator: string | null;
  website: string | null;
  created_at: string;
  verified_at: string | null;
  updated_at: string;
  reputation_tier: "new" | "active" | "established" | "trusted";
  // v2 fields
  headline: string | null;
  skills: string[];
  github_username: string | null;
  twitter_handle: string | null;
}

export interface Endorsement {
  id: string;
  from_agent_id: string;
  to_agent_id: string;
  skill: string;
  note: string | null;
  collaboration_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Collaboration {
  id: string;
  agent_a_id: string;
  agent_b_id: string;
  source: "moltbook_dm" | "moltbook_thread" | "task_handoff" | "api_verified";
  source_id: string | null;
  verified_at: string;
}

export interface VerificationCode {
  code: string;
  moltbook_handle: string;
  expires_at: string;
  claimed: boolean;
}

// v2 interfaces
export interface AgentProject {
  id: string;
  agent_id: string;
  title: string;
  description: string | null;
  url: string | null;
  image_url: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  skills: string[];
  created_at: string;
  updated_at: string;
}

export type ActivityType = 
  | "moltbook_post" 
  | "endorsement_given" 
  | "endorsement_received" 
  | "project_added";

export interface AgentActivity {
  id: string;
  agent_id: string;
  activity_type: ActivityType;
  source_id: string | null;
  source_url: string | null;
  title: string | null;
  summary: string | null;
  metadata: Record<string, unknown>;
  occurred_at: string;
  created_at: string;
}

// Public client (for read operations)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server client (for write operations - use in API routes only)
export function createServerClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
