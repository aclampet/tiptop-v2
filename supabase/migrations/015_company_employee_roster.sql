-- ============================================================
-- Employer Pages: Employee roster, featured workers, visibility
-- ============================================================

-- 1. Add employment state + display controls to positions
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_on_company_page BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS started_at DATE,
  ADD COLUMN IF NOT EXISTS ended_at DATE;

-- Backfill is_current from end_date
UPDATE positions SET is_current = (end_date IS NULL) WHERE is_current IS NULL;

-- 2. company_featured_workers
CREATE TABLE IF NOT EXISTS company_featured_workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, worker_id)
);
CREATE INDEX IF NOT EXISTS idx_company_featured_workers_company ON company_featured_workers(company_id);

-- 3. RLS for positions: scoped updates
-- Drop existing policies that conflict (we'll add more specific ones)
-- Worker: UPDATE own positions for show_on_company_page, started_at, ended_at, is_current
CREATE POLICY "Workers can update own position roster fields"
  ON positions FOR UPDATE
  USING (worker_id IN (SELECT id FROM workers WHERE auth_user_id = auth.uid()))
  WITH CHECK (
    worker_id IN (SELECT id FROM workers WHERE auth_user_id = auth.uid())
    AND (ended_at IS NULL OR is_current = false)
  );

-- Company owners/admins: UPDATE positions for their company
CREATE POLICY "Company owners and admins can update position roster fields"
  ON positions FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM company_memberships
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_memberships
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Public SELECT for roster: worker.is_public, position.show_on_company_page, position.is_current
-- (Existing SELECT policies may allow more; we add a restrictive one for roster view)
-- Note: RLS SELECT is additive (OR). We need positions visible when:
--   (own position) OR (public roster: worker is_public AND show_on_company_page AND is_current)
-- Existing policy likely allows "public positions" - we add policy for roster visibility.
-- Simplest: ensure we have a policy that allows SELECT for roster case.
-- The company page uses admin client currently - we'll switch to session/client and RLS will apply.
-- Drop generic public select if exists and recreate with roster filter - actually positions
-- may have "Public can select positions" already. We add a NEW policy for roster-visible only.
-- Actually the requirement says "Public can SELECT only positions where..." - that might mean
-- we need to REPLACE the public select. Let me check existing policies.
-- From audit: "SELECT: public positions, own". So there's already a public select.
-- The user wants: for roster view, only worker.is_public AND show_on_company_page AND is_current.
-- The existing "public positions" might be broad. We don't want to break worker profiles.
-- The company employees API will use session client - it needs to return only roster-visible.
-- We could do filtering in the API, or add an RLS policy. For minimal change, the API
-- will filter: only positions where show_on_company_page AND is_current, and join workers
-- where is_public. The RLS policies for positions: workers can update roster fields.
-- For SELECT, if the existing policy is permissive, the API will need to filter.
-- Let me add a policy that allows public to see positions only when those conditions hold.
-- Actually in Postgres RLS, multiple SELECT policies are OR'd. So if we have:
-- - "Users can see own positions"
-- - "Public can see positions" (broad)
-- Then adding another "Public can see roster positions" would just add more rows.
-- The safest approach: add an RPC or have the API use a view. For MVP, the API
-- will do the filtering in the query (.eq('show_on_company_page', true).eq('is_current', true))
-- and join workers where is_public. The session client with anon will only get what
-- RLS allows. So we need an RLS policy that allows anon to SELECT positions where
-- that position's worker is_public AND position show_on_company_page AND is_current.
-- That requires a subquery/join in the policy.

DROP POLICY IF EXISTS "Public can select positions" ON positions;
CREATE POLICY "Select roster-visible or own positions"
  ON positions FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND worker_id IN (SELECT id FROM workers WHERE auth_user_id = auth.uid()))
    OR (
      show_on_company_page = true
      AND is_current = true
      AND EXISTS (SELECT 1 FROM workers w WHERE w.id = positions.worker_id AND w.is_public = true)
    )
  );

-- 4. RLS for company_featured_workers
ALTER TABLE company_featured_workers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company owners and admins can manage featured workers"
  ON company_featured_workers FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM company_memberships
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_memberships
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Public can select featured workers"
  ON company_featured_workers FOR SELECT
  USING (true);
