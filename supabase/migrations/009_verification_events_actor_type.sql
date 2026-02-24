-- ============================================================
-- Add actor_type to verification_events
-- ============================================================

ALTER TABLE verification_events
  ADD COLUMN IF NOT EXISTS actor_type TEXT NOT NULL DEFAULT 'user';

UPDATE verification_events
SET actor_type = CASE
  WHEN metadata->>'token_based' = 'true' OR actor_user_id IS NULL THEN 'token'
  ELSE 'user'
END;

ALTER TABLE verification_events
  ADD CONSTRAINT verification_events_actor_type_check
  CHECK (actor_type IN ('user', 'token'));

ALTER TABLE verification_events
  ADD CONSTRAINT verification_events_actor_user_id_check
  CHECK (
    (actor_type = 'token' AND actor_user_id IS NULL)
    OR (actor_type = 'user' AND actor_user_id IS NOT NULL)
  );

-- Update RPC to insert actor_type
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
