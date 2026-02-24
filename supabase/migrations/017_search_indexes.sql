-- ============================================================
-- Search indexes for homepage search (workers + companies)
-- ============================================================

-- Ensure pg_trgm exists (optional, may already exist from base schema)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Workers: index for public-only prefix search on display_name and slug
CREATE INDEX IF NOT EXISTS idx_workers_public_slug
  ON workers(slug) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_workers_public_display_name_lower
  ON workers(lower(display_name) text_pattern_ops) WHERE is_public = true;

-- Companies: slug already indexed; add name prefix search
CREATE INDEX IF NOT EXISTS idx_companies_name_lower
  ON companies(lower(name) text_pattern_ops);

-- Optional trigram indexes (requires pg_trgm). Skip silently if extension missing.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    CREATE INDEX IF NOT EXISTS idx_workers_display_name_trgm
      ON workers USING gin(display_name gin_trgm_ops) WHERE is_public = true;
    CREATE INDEX IF NOT EXISTS idx_companies_name_trgm
      ON companies USING gin(name gin_trgm_ops);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL; -- Skip trigram indexes if extension unavailable
END
$$;
