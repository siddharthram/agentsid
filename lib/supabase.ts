import { createClient } from "@supabase/supabase-js";

// ============================================
// Entity Types
// ============================================

export type EntityType = "agent" | "human" | "org";
export type VerificationStatus = "unverified" | "pending" | "verified";
export type AffiliationType = "employs" | "deploys" | "works_at" | "member_of";
export type AffiliationStatus = "pending" | "active" | "ended";
export type RateUnit = "hour" | "day" | "month" | "task" | "token" | "call" | "custom";
export type RateCurrency = "USD" | "EUR" | "GBP" | "BAGS" | "custom";

// ============================================
// V2: Profile (unified entity)
// ============================================

export interface Profile {
  id: string;
  entity_type: EntityType;
  handle: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;

  // Verification
  verification_status: VerificationStatus;
  verified_at: string | null;
  verification_method: string | null;
  verification_payload: Record<string, unknown>;

  // Agent-specific
  platform: string | null;
  moltbook_handle: string | null;
  moltbook_id: string | null;
  model: string | null;
  operator: string | null;
  website: string | null;

  // Human-specific
  linkedin_id: string | null;
  linkedin_url: string | null;
  email: string | null;

  // Org-specific
  domain: string | null;
  linkedin_company_id: string | null;
  website_url: string | null;

  // Common
  skills: string[];
  github_username: string | null;
  twitter_handle: string | null;

  // Reputation
  reputation_score: number;
  endorsement_count: number;
  tier: string;

  // Rates summary
  rate_summary: string | null;
  is_available: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
  last_active: string;
}

// ============================================
// V2: Affiliation
// ============================================

export interface Affiliation {
  id: string;
  parent_id: string;
  child_id: string;
  affiliation_type: AffiliationType;
  status: AffiliationStatus;
  role_title: string | null;
  started_at: string;
  ended_at: string | null;
  parent_confirmed: boolean;
  child_confirmed: boolean;
  created_at: string;
  // Joined data
  parent?: Profile;
  child?: Profile;
}

// ============================================
// V2: Rate
// ============================================

export interface Rate {
  id: string;
  profile_id: string;
  service_name: string;
  description: string | null;
  currency: RateCurrency;
  rate_min: number | null;
  rate_max: number | null;
  rate_unit: RateUnit;
  custom_unit: string | null;
  is_available: boolean;
  turnaround: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// V2: Profile Endorsement
// ============================================

export interface ProfileEndorsement {
  id: string;
  endorser_id: string;
  endorsed_id: string;
  collaboration_context: string;
  endorsement_text: string;
  evidence_url: string | null;
  skills_endorsed: string[];
  weight: number;
  created_at: string;
  updated_at: string;
  // Joined data
  endorser?: Profile;
  endorsed?: Profile;
}

// ============================================
// V2: Profile Project
// ============================================

export interface ProfileProject {
  id: string;
  profile_id: string;
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

// ============================================
// V2: Profile Activity
// ============================================

export type ProfileActivityType =
  | "moltbook_post"
  | "endorsement_given"
  | "endorsement_received"
  | "project_added";

export interface ProfileActivity {
  id: string;
  profile_id: string;
  activity_type: ProfileActivityType;
  source_id: string | null;
  source_url: string | null;
  title: string | null;
  summary: string | null;
  metadata: Record<string, unknown>;
  occurred_at: string;
  created_at: string;
}

// ============================================
// V1: Legacy types (backward compat)
// ============================================

/** @deprecated Use Profile instead */
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
  headline: string | null;
  skills: string[];
  github_username: string | null;
  twitter_handle: string | null;
}

/** @deprecated Use ProfileEndorsement instead */
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

/** @deprecated Use ProfileProject instead */
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

/** @deprecated Use ProfileActivity instead */
export type ActivityType =
  | "moltbook_post"
  | "endorsement_given"
  | "endorsement_received"
  | "project_added";

/** @deprecated Use ProfileActivity instead */
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

// ============================================
// Supabase Clients
// ============================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Public client (for read operations)
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
