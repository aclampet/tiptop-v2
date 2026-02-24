-- ============================================================
-- Verification Events (audit trail)
-- ============================================================

CREATE TABLE IF NOT EXISTS verification_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID REFERENCES companies(id) ON DELETE SET NULL,
  position_id     UUID REFERENCES positions(id) ON DELETE SET NULL,  -- NULL when position deleted
  actor_user_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type      TEXT NOT NULL CHECK (event_type IN (
    'hr_profile_approved',
    'hr_profile_rejected',
    'position_approved',
    'position_denied'
  )),
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_events_company ON verification_events(company_id);
CREATE INDEX IF NOT EXISTS idx_verification_events_position ON verification_events(position_id);
CREATE INDEX IF NOT EXISTS idx_verification_events_created ON verification_events(created_at DESC);

ALTER TABLE verification_events ENABLE ROW LEVEL SECURITY;

-- Only company owners/admins can read events for their company
CREATE POLICY "Owners and admins can select verification_events for their company"
  ON verification_events FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_memberships
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
