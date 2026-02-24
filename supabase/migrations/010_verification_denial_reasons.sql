-- ============================================================
-- Require reason_code for denial/rejection events (RPC validation)
-- ============================================================

CREATE OR REPLACE FUNCTION public.log_verification_event(
  p_company_id    UUID,
  p_position_id   UUID DEFAULT NULL,
  p_event_type    TEXT,
  p_metadata      JSONB DEFAULT '{}'::jsonb,
  p_actor_type    TEXT DEFAULT 'user'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_user_id UUID;
  v_event_id      UUID;
  v_allowed       BOOLEAN;
  v_reason_code   TEXT;
  v_reason_note   TEXT;
BEGIN
  IF p_actor_type NOT IN ('user', 'token') THEN
    RAISE EXCEPTION 'Invalid actor_type: %', p_actor_type;
  END IF;

  IF p_event_type NOT IN (
    'hr_profile_approved',
    'hr_profile_rejected',
    'position_approved',
    'position_denied'
  ) THEN
    RAISE EXCEPTION 'Invalid event_type: %', p_event_type;
  END IF;

  -- Denials/rejections require reason_code
  IF p_event_type IN ('position_denied', 'hr_profile_rejected') THEN
    v_reason_code := p_metadata->>'reason_code';
    IF v_reason_code IS NULL OR v_reason_code = '' THEN
      RAISE EXCEPTION 'reason_code required for %', p_event_type;
    END IF;
    IF p_event_type = 'position_denied' AND v_reason_code NOT IN (
      'not_employee', 'wrong_role_or_dates', 'insufficient_info', 'suspicious_or_fraud', 'other'
    ) THEN
      RAISE EXCEPTION 'Invalid reason_code for position_denied: %', v_reason_code;
    END IF;
    IF p_event_type = 'hr_profile_rejected' AND v_reason_code NOT IN (
      'email_domain_mismatch', 'not_hr', 'insufficient_info', 'other'
    ) THEN
      RAISE EXCEPTION 'Invalid reason_code for hr_profile_rejected: %', v_reason_code;
    END IF;
    -- Trim reason_note to 500 chars in metadata
    v_reason_note := LEFT(COALESCE(p_metadata->>'reason_note', ''), 500);
    IF v_reason_note != '' THEN
      p_metadata := COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('reason_note', v_reason_note);
    END IF;
  END IF;

  IF p_actor_type = 'user' THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Unauthorized: auth.uid() required for actor_type user';
    END IF;
    SELECT EXISTS (
      SELECT 1 FROM company_memberships
      WHERE company_id = p_company_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    ) INTO v_allowed;
    IF NOT v_allowed THEN
      SELECT EXISTS (
        SELECT 1 FROM hr_profiles
        WHERE company_id = p_company_id
          AND user_id = auth.uid()
          AND status = 'verified'
      ) INTO v_allowed;
    END IF;
    IF NOT v_allowed THEN
      RAISE EXCEPTION 'Unauthorized: must be company owner/admin or verified HR';
    END IF;
    v_actor_user_id := auth.uid();
  ELSE
    v_actor_user_id := NULL;
  END IF;

  INSERT INTO verification_events (
    company_id,
    position_id,
    actor_user_id,
    actor_type,
    event_type,
    metadata
  ) VALUES (
    p_company_id,
    p_position_id,
    v_actor_user_id,
    p_actor_type,
    p_event_type,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;
