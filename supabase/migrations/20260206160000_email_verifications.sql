-- Email verification codes for org domain verification
CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_email_verifications_org ON email_verifications(org_id);
CREATE INDEX idx_email_verifications_code ON email_verifications(code, org_id);

-- RLS: only service role can read/write
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;
