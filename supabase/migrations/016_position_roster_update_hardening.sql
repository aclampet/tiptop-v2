-- ============================================================
-- Harden positions UPDATE: only roster fields modifiable by role
-- ============================================================

-- 1. SECURITY DEFINER function: which columns may change
CREATE OR REPLACE FUNCTION public.position_roster_update_allowed(
  old_row positions,
  new_row positions,
  is_admin boolean
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF is_admin THEN
    -- Admins may only change: show_on_company_page, is_current
    RETURN
      (old_row.id IS NOT DISTINCT FROM new_row.id)
      AND (old_row.worker_id IS NOT DISTINCT FROM new_row.worker_id)
      AND (old_row.company_id IS NOT DISTINCT FROM new_row.company_id)
      AND (old_row.title IS NOT DISTINCT FROM new_row.title)
      AND (old_row.start_date IS NOT DISTINCT FROM new_row.start_date)
      AND (old_row.end_date IS NOT DISTINCT FROM new_row.end_date)
      AND (old_row.verification_email IS NOT DISTINCT FROM new_row.verification_email)
      AND (old_row.email_verified IS NOT DISTINCT FROM new_row.email_verified)
      AND (old_row.email_verified_at IS NOT DISTINCT FROM new_row.email_verified_at)
      AND (old_row.hr_verified IS NOT DISTINCT FROM new_row.hr_verified)
      AND (old_row.hr_verified_at IS NOT DISTINCT FROM new_row.hr_verified_at)
      AND (old_row.hr_verified_by IS NOT DISTINCT FROM new_row.hr_verified_by)
      AND (old_row.rating IS NOT DISTINCT FROM new_row.rating)
      AND (old_row.review_count IS NOT DISTINCT FROM new_row.review_count)
      AND (old_row.is_active IS NOT DISTINCT FROM new_row.is_active)
      AND (old_row.started_at IS NOT DISTINCT FROM new_row.started_at)
      AND (old_row.ended_at IS NOT DISTINCT FROM new_row.ended_at)
      AND (old_row.created_at IS NOT DISTINCT FROM new_row.created_at);
  ELSE
    -- Workers may only change: show_on_company_page, started_at, ended_at, is_current
    RETURN
      (old_row.id IS NOT DISTINCT FROM new_row.id)
      AND (old_row.worker_id IS NOT DISTINCT FROM new_row.worker_id)
      AND (old_row.company_id IS NOT DISTINCT FROM new_row.company_id)
      AND (old_row.title IS NOT DISTINCT FROM new_row.title)
      AND (old_row.start_date IS NOT DISTINCT FROM new_row.start_date)
      AND (old_row.end_date IS NOT DISTINCT FROM new_row.end_date)
      AND (old_row.verification_email IS NOT DISTINCT FROM new_row.verification_email)
      AND (old_row.email_verified IS NOT DISTINCT FROM new_row.email_verified)
      AND (old_row.email_verified_at IS NOT DISTINCT FROM new_row.email_verified_at)
      AND (old_row.hr_verified IS NOT DISTINCT FROM new_row.hr_verified)
      AND (old_row.hr_verified_at IS NOT DISTINCT FROM new_row.hr_verified_at)
      AND (old_row.hr_verified_by IS NOT DISTINCT FROM new_row.hr_verified_by)
      AND (old_row.rating IS NOT DISTINCT FROM new_row.rating)
      AND (old_row.review_count IS NOT DISTINCT FROM new_row.review_count)
      AND (old_row.is_active IS NOT DISTINCT FROM new_row.is_active)
      AND (old_row.created_at IS NOT DISTINCT FROM new_row.created_at);
  END IF;
END;
$$;

-- 2. Helper for RLS: fetch old row and call core function
CREATE OR REPLACE FUNCTION public.position_roster_update_check(
  p_new positions,
  p_is_admin boolean
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old positions;
BEGIN
  SELECT * INTO v_old FROM positions WHERE id = p_new.id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  RETURN position_roster_update_allowed(v_old, p_new, p_is_admin);
END;
$$;

-- 3. Drop existing UPDATE policies on positions
DROP POLICY IF EXISTS "Workers can update own position roster fields" ON positions;
DROP POLICY IF EXISTS "Company owners and admins can update position roster fields" ON positions;
DROP POLICY IF EXISTS "Workers can update own positions" ON positions;
DROP POLICY IF EXISTS "Workers can update positions" ON positions;
DROP POLICY IF EXISTS "Company owners and admins can update positions" ON positions;

-- 4. Replace with hardened policies
CREATE POLICY "Workers can update own position roster fields"
  ON positions FOR UPDATE
  USING (worker_id IN (SELECT id FROM workers WHERE auth_user_id = auth.uid()))
  WITH CHECK (
    worker_id IN (SELECT id FROM workers WHERE auth_user_id = auth.uid())
    AND position_roster_update_check(positions, false)
  );

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
    AND position_roster_update_check(positions, true)
  );
