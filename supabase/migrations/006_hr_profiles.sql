-- ============================================================
-- HR Verification Profiles
-- ============================================================

-- Add 'hr' to allowed user_roles
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('worker', 'admin', 'company_admin', 'hr'));

CREATE TABLE IF NOT EXISTS hr_profiles (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id   UUID REFERENCES companies(id) ON DELETE SET NULL,
  work_email   TEXT,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  verified_at  TIMESTAMPTZ,
  verified_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_hr_profiles_company ON hr_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_profiles_status ON hr_profiles(status);

ALTER TABLE hr_profiles ENABLE ROW LEVEL SECURITY;

-- User can read their own hr_profile
CREATE POLICY "Users can select own hr_profile"
  ON hr_profiles FOR SELECT
  USING (user_id = auth.uid());

-- User can insert their own hr_profile (onboarding)
CREATE POLICY "Users can insert own hr_profile"
  ON hr_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- User can update their own hr_profile (work_email, company_id); status change blocked by trigger
CREATE POLICY "Users can update own hr_profile"
  ON hr_profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Block users from changing their own status (only owners/admins can)
CREATE OR REPLACE FUNCTION hr_profiles_prevent_user_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.user_id = auth.uid()
     AND NEW.status IS DISTINCT FROM OLD.status
     AND NOT EXISTS (
       SELECT 1 FROM company_memberships
       WHERE company_id = OLD.company_id
         AND user_id = auth.uid()
         AND role IN ('owner', 'admin')
     ) THEN
    RAISE EXCEPTION 'Only company owners/admins can change hr_profile status';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trigger_hr_profiles_prevent_status_change
  BEFORE UPDATE ON hr_profiles
  FOR EACH ROW EXECUTE FUNCTION hr_profiles_prevent_user_status_change();

-- Company owners/admins can select hr_profiles for their company
CREATE POLICY "Owners and admins can select hr_profiles for their company"
  ON hr_profiles FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_memberships
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Allow users to add 'hr' role for themselves (self-service)
CREATE POLICY "Users can insert own hr role"
  ON user_roles FOR INSERT
  WITH CHECK (user_id = auth.uid() AND role = 'hr');

-- Company owners/admins can update status (verified/rejected) for their company
CREATE POLICY "Owners and admins can update hr_profile status for their company"
  ON hr_profiles FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM company_memberships
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (TRUE);
