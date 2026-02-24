-- ============================================================
-- Company Memberships + Claiming
-- ============================================================

-- Company memberships (owner/admin)
CREATE TABLE IF NOT EXISTS company_memberships (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, user_id)
);

-- Pending invites (for inviting by email)
CREATE TABLE IF NOT EXISTS company_invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin')),
  invited_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, email)
);

CREATE INDEX IF NOT EXISTS idx_company_memberships_company ON company_memberships(company_id);
CREATE INDEX IF NOT EXISTS idx_company_memberships_user ON company_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_company_invites_company ON company_invites(company_id);

-- RLS
ALTER TABLE company_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_invites ENABLE ROW LEVEL SECURITY;

-- company_memberships policies
CREATE POLICY "Users can select own memberships"
  ON company_memberships FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Owners and admins can select memberships for their company"
  ON company_memberships FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_memberships
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can insert memberships"
  ON company_memberships FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_memberships
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can claim unowned or self-created companies"
  ON company_memberships FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'owner'
    AND (
      NOT EXISTS (
        SELECT 1 FROM company_memberships cm
        WHERE cm.company_id = company_memberships.company_id AND cm.role = 'owner'
      )
      OR company_id IN (SELECT id FROM companies WHERE created_by = auth.uid())
    )
  );

CREATE POLICY "Only owners can delete memberships"
  ON company_memberships FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM company_memberships
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- company_invites policies
CREATE POLICY "Owners and admins can manage invites for their company"
  ON company_invites FOR ALL
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

-- Update company permissions: owners/admins get full update; workers restricted
DROP POLICY IF EXISTS "Company creators can update their companies" ON companies;
DROP POLICY IF EXISTS "Admins can update companies" ON companies;
DROP POLICY IF EXISTS "Workers with positions can update company" ON companies;

-- Platform admins (user_roles) and company owners/admins: full update
CREATE POLICY "Company owners and admins can update companies"
  ON companies FOR UPDATE
  USING (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')
    OR id IN (
      SELECT company_id FROM company_memberships
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR created_by = auth.uid()
  )
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')
    OR id IN (
      SELECT company_id FROM company_memberships
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR created_by = auth.uid()
  );

-- Workers with positions: only hr_email and verification_status (unverified→registered)
CREATE OR REPLACE FUNCTION public.company_worker_update_allowed(new_row companies)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_row companies;
BEGIN
  SELECT * INTO old_row FROM companies WHERE id = new_row.id;
  IF NOT FOUND THEN RETURN false; END IF;

  -- Only hr_email and verification_status (unverified→registered) may change
  IF new_row.name IS DISTINCT FROM old_row.name
     OR new_row.slug IS DISTINCT FROM old_row.slug
     OR new_row.address IS DISTINCT FROM old_row.address
     OR new_row.city IS DISTINCT FROM old_row.city
     OR new_row.state IS DISTINCT FROM old_row.state
     OR new_row.zip IS DISTINCT FROM old_row.zip
     OR new_row.country IS DISTINCT FROM old_row.country
     OR new_row.industry IS DISTINCT FROM old_row.industry
     OR new_row.email_domain IS DISTINCT FROM old_row.email_domain
     OR new_row.website IS DISTINCT FROM old_row.website
     OR new_row.logo_url IS DISTINCT FROM old_row.logo_url
     OR new_row.verified_at IS DISTINCT FROM old_row.verified_at
     OR new_row.verified_by IS DISTINCT FROM old_row.verified_by
     OR new_row.created_by IS DISTINCT FROM old_row.created_by
  THEN
    RETURN false;
  END IF;

  IF new_row.verification_status IS DISTINCT FROM old_row.verification_status THEN
    IF NOT (old_row.verification_status = 'unverified' AND new_row.verification_status = 'registered') THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$;

CREATE POLICY "Workers with positions can update limited company fields"
  ON companies FOR UPDATE
  USING (
    id IN (
      SELECT company_id FROM positions p
      JOIN workers w ON w.id = p.worker_id
      WHERE w.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    id IN (
      SELECT company_id FROM positions p
      JOIN workers w ON w.id = p.worker_id
      WHERE w.auth_user_id = auth.uid()
    )
    AND company_worker_update_allowed(companies)
  );
