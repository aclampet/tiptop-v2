-- ============================================================
-- Rate limits table (Supabase fallback when Upstash Redis unavailable)
-- ============================================================

CREATE TABLE IF NOT EXISTS rate_limits (
  rate_key TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 0,
  reset_at TIMESTAMPTZ NOT NULL
);

-- No RLS - backend uses service role for read/write
