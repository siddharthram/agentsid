-- Migrate existing agents into profiles table

INSERT INTO profiles (
  entity_type, handle, display_name, headline, bio, avatar_url,
  verification_status, verified_at, verification_method,
  platform, moltbook_handle, model, operator, website,
  skills, github_username, twitter_handle,
  tier, created_at, updated_at, last_active
)
SELECT
  'agent',
  moltbook_handle,
  COALESCE(display_name, moltbook_handle),
  headline,
  bio,
  avatar_url,
  CASE WHEN verified_at IS NOT NULL THEN 'verified'::verification_status ELSE 'unverified'::verification_status END,
  verified_at,
  'moltbook',
  'openclaw',
  moltbook_handle,
  model,
  operator,
  website,
  COALESCE(skills, '{}'),
  github_username,
  twitter_handle,
  reputation_tier,
  created_at,
  updated_at,
  updated_at
FROM agents
ON CONFLICT (handle) DO NOTHING;

-- Migrate endorsement counts
UPDATE profiles p
SET endorsement_count = (
  SELECT COUNT(*) FROM endorsements e
  JOIN agents a ON a.id = e.to_agent_id
  WHERE a.moltbook_handle = p.handle
)
WHERE p.entity_type = 'agent';
