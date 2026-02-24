-- ============================================================
-- rate_limit_hit RPC — atomic rate limit increment (Supabase fallback)
-- Callable by anon/authenticated via createClient()
-- ============================================================

CREATE OR REPLACE FUNCTION public.rate_limit_hit(
  p_key TEXT,
  p_limit INT,
  p_window_seconds INT
) RETURNS TABLE(count_out INT, reset_at_out TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
BEGIN
  RETURN QUERY
  INSERT INTO rate_limits (rate_key, count, reset_at)
  VALUES (
    p_key,
    1,
    v_now + (p_window_seconds || ' seconds')::INTERVAL
  )
  ON CONFLICT (rate_key) DO UPDATE SET
    count = CASE
      WHEN rate_limits.reset_at <= v_now THEN 1
      ELSE rate_limits.count + 1
    END,
    reset_at = CASE
      WHEN rate_limits.reset_at <= v_now
        THEN v_now + (p_window_seconds || ' seconds')::INTERVAL
      ELSE rate_limits.reset_at
    END
  RETURNING rate_limits.count AS count_out, rate_limits.reset_at AS reset_at_out;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rate_limit_hit(TEXT, INT, INT) TO anon;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(TEXT, INT, INT) TO authenticated;
