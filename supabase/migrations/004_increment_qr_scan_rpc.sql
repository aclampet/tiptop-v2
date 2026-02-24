-- ============================================================
-- RPC: increment_qr_scan
-- Atomic scan count increment, callable by anon/authenticated
-- ============================================================

CREATE OR REPLACE FUNCTION public.increment_qr_scan(p_token_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE qr_tokens
  SET scan_count = COALESCE(scan_count, 0) + 1
  WHERE id = p_token_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_qr_scan(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_qr_scan(uuid) TO authenticated;
