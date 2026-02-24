-- ============================================================
-- RLS Policy Additions for Session-Based API Refactor
-- Run this migration in Supabase SQL Editor
-- ============================================================

-- Workers can delete their own positions (cascade handles reviews/qr_tokens)
CREATE POLICY "Workers can delete their own positions"
  ON positions FOR DELETE
  USING (
    worker_id IN (SELECT id FROM workers WHERE auth_user_id = auth.uid())
  );

-- Admins can update any company
CREATE POLICY "Admins can update companies"
  ON companies FOR UPDATE
  USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin'));

-- Workers with positions at a company can update it (e.g. add hr_email for verification)
CREATE POLICY "Workers with positions can update company"
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
  );
