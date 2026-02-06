-- Migration: Multi-Entity Model (v2)
-- Adds profiles (agents + humans + orgs), affiliations, and rates tables
-- Run with: psql $DATABASE_URL -f migrations/003_multi_entity.sql

-- ============================================
-- 1. ENUMS
-- ============================================

CREATE TYPE entity_type AS ENUM ('agent', 'human', 'org');
CREATE TYPE verification_status AS ENUM ('unverified', 'pending', 'verified');
CREATE TYPE affiliation_type AS ENUM ('employs', 'deploys', 'works_at', 'member_of');
CREATE TYPE affiliation_status AS ENUM ('pending', 'active', 'ended');
CREATE TYPE rate_unit AS ENUM ('hour', 'day', 'month', 'task', 'token', 'call', 'custom');
CREATE TYPE rate_currency AS ENUM ('USD', 'EUR', 'GBP', 'BAGS', 'custom');

-- ============================================
-- 2. PROFILES TABLE (unified entity)
-- ============================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  entity_type entity_type NOT NULL,
  handle TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  headline TEXT,
  bio TEXT,
  avatar_url TEXT,

  -- Verification
  verification_status verification_status DEFAULT 'unverified',
  verified_at TIMESTAMPTZ,
  verification_method TEXT,
  verification_payload JSONB DEFAULT '{}',

  -- Agent-specific
  platform TEXT,
  moltbook_handle TEXT,
  moltbook_id TEXT,
  model TEXT,
  operator TEXT,
  website TEXT,

  -- Human-specific
  linkedin_id TEXT,
  linkedin_url TEXT,
  email TEXT,

  -- Org-specific
  domain TEXT,
  linkedin_company_id TEXT,
  website_url TEXT,

  -- Common
  skills TEXT[] DEFAULT '{}',
  github_username TEXT,
  twitter_handle TEXT,

  -- Reputation
  reputation_score NUMERIC(3,1) DEFAULT 0.0,
  endorsement_count INT DEFAULT 0,
  tier TEXT DEFAULT 'new',

  -- Rates summary (denormalized)
  rate_summary TEXT,
  is_available BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_active TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_agent CHECK (
    entity_type != 'agent' OR platform IS NOT NULL
  )
);

-- Indexes
CREATE INDEX idx_profiles_type ON profiles(entity_type);
CREATE INDEX idx_profiles_handle ON profiles(handle);
CREATE INDEX idx_profiles_skills ON profiles USING GIN (skills);
CREATE INDEX idx_profiles_reputation ON profiles(reputation_score DESC);
CREATE INDEX idx_profiles_moltbook ON profiles(moltbook_handle) WHERE moltbook_handle IS NOT NULL;
CREATE INDEX idx_profiles_linkedin ON profiles(linkedin_id) WHERE linkedin_id IS NOT NULL;
CREATE INDEX idx_profiles_available ON profiles(is_available) WHERE is_available = true;
CREATE INDEX idx_profiles_tier ON profiles(tier);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read profiles" ON profiles;
CREATE POLICY "Public read profiles" ON profiles
  FOR SELECT USING (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_profiles_updated_at();

-- ============================================
-- 3. AFFILIATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS affiliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  affiliation_type affiliation_type NOT NULL,
  status affiliation_status DEFAULT 'pending',

  role_title TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,

  parent_confirmed BOOLEAN DEFAULT false,
  child_confirmed BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(parent_id, child_id, affiliation_type),
  CONSTRAINT no_self_affiliation CHECK (parent_id != child_id)
);

CREATE INDEX idx_affiliations_parent ON affiliations(parent_id);
CREATE INDEX idx_affiliations_child ON affiliations(child_id);
CREATE INDEX idx_affiliations_status ON affiliations(status);

ALTER TABLE affiliations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active affiliations" ON affiliations;
CREATE POLICY "Public read active affiliations" ON affiliations
  FOR SELECT USING (status = 'active');

-- ============================================
-- 4. RATES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  service_name TEXT NOT NULL,
  description TEXT,

  currency rate_currency DEFAULT 'USD',
  rate_min NUMERIC(12,2),
  rate_max NUMERIC(12,2),
  rate_unit rate_unit NOT NULL,
  custom_unit TEXT,

  is_available BOOLEAN DEFAULT true,
  turnaround TEXT,

  sort_order INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rates_profile ON rates(profile_id);
CREATE INDEX idx_rates_available ON rates(is_available) WHERE is_available = true;

ALTER TABLE rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read rates" ON rates;
CREATE POLICY "Public read rates" ON rates
  FOR SELECT USING (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_rates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_rates_updated_at ON rates;
CREATE TRIGGER set_rates_updated_at
  BEFORE UPDATE ON rates
  FOR EACH ROW EXECUTE FUNCTION update_rates_updated_at();

-- ============================================
-- 5. V2 ENDORSEMENTS (references profiles)
-- ============================================

CREATE TABLE IF NOT EXISTS profile_endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  endorser_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endorsed_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  collaboration_context TEXT NOT NULL,
  endorsement_text TEXT NOT NULL,
  evidence_url TEXT,
  skills_endorsed TEXT[] DEFAULT '{}',

  weight NUMERIC(3,2) DEFAULT 1.0,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(endorser_id, endorsed_id),
  CONSTRAINT no_self_endorsement CHECK (endorser_id != endorsed_id)
);

CREATE INDEX idx_profile_endorsements_endorsed ON profile_endorsements(endorsed_id);
CREATE INDEX idx_profile_endorsements_endorser ON profile_endorsements(endorser_id);

ALTER TABLE profile_endorsements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read profile_endorsements" ON profile_endorsements;
CREATE POLICY "Public read profile_endorsements" ON profile_endorsements
  FOR SELECT USING (true);

-- ============================================
-- 6. PROFILE PROJECTS (new table alongside old)
-- ============================================

CREATE TABLE IF NOT EXISTS profile_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  image_url TEXT,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN DEFAULT false,
  skills TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_profile_projects_profile ON profile_projects(profile_id);

ALTER TABLE profile_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read profile_projects" ON profile_projects;
CREATE POLICY "Public read profile_projects" ON profile_projects
  FOR SELECT USING (true);

-- ============================================
-- 7. PROFILE ACTIVITY (new table alongside old)
-- ============================================

CREATE TABLE IF NOT EXISTS profile_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  source_id TEXT,
  source_url TEXT,
  title TEXT,
  summary TEXT,
  metadata JSONB DEFAULT '{}',
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_profile_activity_profile ON profile_activity(profile_id);
CREATE INDEX idx_profile_activity_time ON profile_activity(occurred_at DESC);

ALTER TABLE profile_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read profile_activity" ON profile_activity;
CREATE POLICY "Public read profile_activity" ON profile_activity
  FOR SELECT USING (true);

-- ============================================
-- 8. DATA MIGRATION HELPER
-- ============================================

-- Migrate existing agents into profiles (run manually when ready)
-- INSERT INTO profiles (
--   entity_type, handle, display_name, headline, bio, avatar_url,
--   verification_status, verified_at, verification_method,
--   platform, moltbook_handle, model, operator, website,
--   skills, github_username, twitter_handle,
--   tier, created_at, updated_at, last_active
-- )
-- SELECT
--   'agent', moltbook_handle, COALESCE(display_name, moltbook_handle),
--   headline, bio, avatar_url,
--   CASE WHEN verified_at IS NOT NULL THEN 'verified' ELSE 'unverified' END,
--   verified_at, 'moltbook',
--   'openclaw', moltbook_handle, model, operator, website,
--   COALESCE(skills, '{}'), github_username, twitter_handle,
--   reputation_tier, created_at, updated_at, updated_at
-- FROM agents;

-- ============================================
-- DONE
-- ============================================

COMMENT ON TABLE profiles IS 'Unified entity table: agents, humans, and orgs';
COMMENT ON TABLE affiliations IS 'Relationships between entities (employs, deploys, works_at, member_of)';
COMMENT ON TABLE rates IS 'Service rates/pricing published by entities';
COMMENT ON TABLE profile_endorsements IS 'V2 endorsements referencing profiles (not agents)';
COMMENT ON TABLE profile_projects IS 'Projects/experience for profiles';
COMMENT ON TABLE profile_activity IS 'Activity feed for profiles';
