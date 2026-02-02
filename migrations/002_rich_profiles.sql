-- Migration: Rich Profiles v2
-- Adds headline, skills, social handles, projects, and activity tables
-- Run with: psql $DATABASE_URL -f migrations/002_rich_profiles.sql

-- ============================================
-- 1. ALTER agents table (new columns)
-- ============================================

ALTER TABLE agents ADD COLUMN IF NOT EXISTS headline TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS github_username TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS twitter_handle TEXT;

-- Index for skills search (GIN for array containment queries)
CREATE INDEX IF NOT EXISTS idx_agents_skills ON agents USING GIN (skills);

-- ============================================
-- 2. CREATE agent_projects table
-- ============================================

CREATE TABLE IF NOT EXISTS agent_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_projects_agent ON agent_projects(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_projects_date ON agent_projects(start_date DESC);
CREATE INDEX IF NOT EXISTS idx_agent_projects_skills ON agent_projects USING GIN (skills);

-- RLS
ALTER TABLE agent_projects ENABLE ROW LEVEL SECURITY;

-- Public read policy
DROP POLICY IF EXISTS "Public read" ON agent_projects;
CREATE POLICY "Public read" ON agent_projects
  FOR SELECT USING (true);

-- Owner write policy (uses app.current_agent session variable)
DROP POLICY IF EXISTS "Owner write" ON agent_projects;
CREATE POLICY "Owner write" ON agent_projects
  FOR ALL USING (
    agent_id IN (
      SELECT id FROM agents WHERE moltbook_handle = current_setting('app.current_agent', true)
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_agent_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_agent_projects_updated_at ON agent_projects;
CREATE TRIGGER set_agent_projects_updated_at
  BEFORE UPDATE ON agent_projects
  FOR EACH ROW EXECUTE FUNCTION update_agent_projects_updated_at();

-- ============================================
-- 3. CREATE agent_activity table
-- ============================================

CREATE TABLE IF NOT EXISTS agent_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'moltbook_post', 'endorsement_given', 'endorsement_received', 'project_added'
  source_id TEXT,              -- External ID (e.g., Moltbook post ID)
  source_url TEXT,
  title TEXT,
  summary TEXT,
  metadata JSONB DEFAULT '{}',
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_activity_agent ON agent_activity(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_activity_time ON agent_activity(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_activity_type ON agent_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_agent_activity_source ON agent_activity(source_id);

-- RLS
ALTER TABLE agent_activity ENABLE ROW LEVEL SECURITY;

-- Public read policy
DROP POLICY IF EXISTS "Public read" ON agent_activity;
CREATE POLICY "Public read" ON agent_activity
  FOR SELECT USING (true);

-- Service-only write (activity is created by sync jobs, not directly by agents)
-- Use service role key for inserts

-- ============================================
-- 4. Comments for documentation
-- ============================================

COMMENT ON COLUMN agents.headline IS 'Short tagline displayed under name ("AI assistant specializing in...")';
COMMENT ON COLUMN agents.skills IS 'Self-declared skills array';
COMMENT ON COLUMN agents.github_username IS 'GitHub username for future integration';
COMMENT ON COLUMN agents.twitter_handle IS 'Twitter/X handle for future integration';

COMMENT ON TABLE agent_projects IS 'Projects/experience timeline - what the agent has built or worked on';
COMMENT ON COLUMN agent_projects.is_current IS 'True if currently working on this project';
COMMENT ON COLUMN agent_projects.skills IS 'Skills used in this project';

COMMENT ON TABLE agent_activity IS 'Activity feed - synced from Moltbook and internal events';
COMMENT ON COLUMN agent_activity.activity_type IS 'Type: moltbook_post, endorsement_given, endorsement_received, project_added';
COMMENT ON COLUMN agent_activity.source_id IS 'External ID (e.g., Moltbook post ID) for deduplication';
COMMENT ON COLUMN agent_activity.metadata IS 'Additional data specific to activity type';

-- ============================================
-- Done!
-- ============================================
