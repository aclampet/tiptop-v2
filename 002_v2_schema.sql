-- ============================================================
-- TipTop.review v2.0 — Multi-Position Architecture
-- This migration transforms the system to support:
-- - Companies with verification levels
-- - Multiple positions per worker
-- - Position-specific QR codes and reviews
-- - Email domain and HR verification
-- ============================================================

-- ============================================================
-- STEP 1: DROP OLD STRUCTURE (if starting fresh)
-- If migrating live data, comment this section out
-- ============================================================

-- DROP TABLE IF EXISTS worker_badges CASCADE;
-- DROP TABLE IF EXISTS reviews CASCADE;
-- DROP TABLE IF EXISTS qr_tokens CASCADE;
-- DROP TABLE IF EXISTS workers CASCADE;
-- DROP TABLE IF EXISTS companies CASCADE;
-- DROP TABLE IF EXISTS badges CASCADE;

-- ============================================================
-- STEP 2: CREATE NEW TABLES
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy text search

-- ============================================================
-- WORKERS (mostly unchanged from v1)
-- ============================================================
CREATE TABLE IF NOT EXISTS workers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  bio             TEXT,
  avatar_url      TEXT,
  overall_rating  NUMERIC(3, 2) DEFAULT 0,
  total_reviews   INTEGER DEFAULT 0,
  is_public       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT workers_auth_user_unique UNIQUE (auth_user_id)
);

-- ============================================================
-- COMPANIES (expanded with verification)
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                    TEXT NOT NULL,
  slug                    TEXT NOT NULL UNIQUE,
  address                 TEXT,
  city                    TEXT,
  state                   TEXT,
  zip                     TEXT,
  country                 TEXT DEFAULT 'US',
  industry                TEXT,
  email_domain            TEXT,  -- e.g., "happyvalley.com" for instant verification
  hr_email                TEXT,  -- Main HR contact for approval requests
  website                 TEXT,
  logo_url                TEXT,
  verification_status     TEXT NOT NULL DEFAULT 'unverified' 
                          CHECK (verification_status IN ('verified', 'registered', 'unverified')),
  verified_at             TIMESTAMPTZ,
  verified_by             UUID REFERENCES auth.users(id),  -- Admin who verified
  created_by              UUID NOT NULL REFERENCES auth.users(id),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT email_domain_lowercase CHECK (email_domain = LOWER(email_domain))
);

-- ============================================================
-- COMPANY VERIFICATION REQUESTS (business self-service)
-- ============================================================
CREATE TABLE IF NOT EXISTS company_verification_requests (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  submitted_by        UUID NOT NULL REFERENCES auth.users(id),
  submitted_email     TEXT NOT NULL,  -- Work email used for verification
  requested_domain    TEXT,           -- Email domain they want verified
  status              TEXT NOT NULL DEFAULT 'pending' 
                      CHECK (status IN ('pending', 'approved', 'denied', 'needs_info')),
  admin_notes         TEXT,           -- Internal notes from reviewer
  reviewed_by         UUID REFERENCES auth.users(id),
  reviewed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- POSITIONS (the core of v2.0)
-- ============================================================
CREATE TABLE IF NOT EXISTS positions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id             UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  company_id            UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,  -- e.g., "Bartender", "Server"
  start_date            DATE NOT NULL,
  end_date              DATE,           -- NULL = current position
  
  -- Verification fields
  verification_email    TEXT,           -- Company email for domain verification
  email_verified        BOOLEAN DEFAULT FALSE,
  email_verified_at     TIMESTAMPTZ,
  hr_verified           BOOLEAN DEFAULT FALSE,
  hr_verified_at        TIMESTAMPTZ,
  hr_verified_by        TEXT,           -- Email of HR person who verified
  
  -- Computed fields
  rating                NUMERIC(3, 2) DEFAULT 0,
  review_count          INTEGER DEFAULT 0,
  
  is_active             BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT verification_email_lowercase CHECK (verification_email = LOWER(verification_email)),
  CONSTRAINT at_least_one_verification CHECK (
    email_verified = TRUE OR hr_verified = TRUE OR (email_verified = FALSE AND hr_verified = FALSE)
  )
);

-- ============================================================
-- QR TOKENS (now linked to positions, not workers)
-- ============================================================
CREATE TABLE IF NOT EXISTS qr_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  label       TEXT NOT NULL DEFAULT 'My QR Code',
  scan_count  INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REVIEWS (now linked to positions, not workers)
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  position_id           UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  qr_token_id           UUID NOT NULL REFERENCES qr_tokens(id),
  rating                INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment               TEXT,
  reviewer_name         TEXT,
  reviewer_fingerprint  TEXT NOT NULL,
  is_verified           BOOLEAN DEFAULT TRUE,
  is_flagged            BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate reviews from same device for same position
  CONSTRAINT unique_device_per_position UNIQUE (position_id, reviewer_fingerprint)
);

-- ============================================================
-- BADGES (unchanged)
-- ============================================================
CREATE TABLE IF NOT EXISTS badges (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  tier            TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  category        TEXT NOT NULL CHECK (category IN ('volume', 'rating', 'streak', 'specialty', 'course')),
  criteria_json   JSONB NOT NULL DEFAULT '{}',
  icon_url        TEXT,
  description     TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WORKER BADGES (unchanged)
-- ============================================================
CREATE TABLE IF NOT EXISTS worker_badges (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id   UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  badge_id    UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at  TIMESTAMPTZ DEFAULT NOW(),
  awarded_by  TEXT NOT NULL DEFAULT 'system' CHECK (awarded_by IN ('system', 'employer', 'admin')),
  UNIQUE(worker_id, badge_id)
);

-- ============================================================
-- USER ROLES (for admin access)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_roles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('worker', 'admin', 'company_admin')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Workers
CREATE INDEX IF NOT EXISTS idx_workers_slug ON workers(slug);
CREATE INDEX IF NOT EXISTS idx_workers_auth_user ON workers(auth_user_id);

-- Companies
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);
CREATE INDEX IF NOT EXISTS idx_companies_verification_status ON companies(verification_status);
CREATE INDEX IF NOT EXISTS idx_companies_email_domain ON companies(email_domain) WHERE email_domain IS NOT NULL;
-- Optional: Fuzzy search index (requires pg_trgm extension)
-- Uncomment this line if you want fuzzy company search:
-- CREATE INDEX IF NOT EXISTS idx_companies_name_trgm ON companies USING gin(name gin_trgm_ops);

-- Positions
CREATE INDEX IF NOT EXISTS idx_positions_worker ON positions(worker_id);
CREATE INDEX IF NOT EXISTS idx_positions_company ON positions(company_id);
CREATE INDEX IF NOT EXISTS idx_positions_active ON positions(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_positions_verification_email ON positions(verification_email) WHERE verification_email IS NOT NULL;

-- QR Tokens
CREATE INDEX IF NOT EXISTS idx_qr_tokens_position ON qr_tokens(position_id);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_reviews_position ON reviews(position_id);
CREATE INDEX IF NOT EXISTS idx_reviews_qr_token ON reviews(qr_token_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_fingerprint ON reviews(reviewer_fingerprint);

-- Company Verification Requests
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON company_verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_verification_requests_company ON company_verification_requests(company_id);

-- Worker Badges
CREATE INDEX IF NOT EXISTS idx_worker_badges_worker ON worker_badges(worker_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE workers                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_tokens                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges                          ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_badges                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_verification_requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles                      ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- WORKERS POLICIES
-- ============================================================

CREATE POLICY "Public profiles are viewable by everyone"
  ON workers FOR SELECT
  USING (is_public = TRUE);

CREATE POLICY "Workers can view their own profile"
  ON workers FOR SELECT
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Workers can update their own profile"
  ON workers FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Authenticated users can create their own worker profile"
  ON workers FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id);

-- ============================================================
-- COMPANIES POLICIES
-- ============================================================

CREATE POLICY "Companies are publicly viewable"
  ON companies FOR SELECT
  USING (TRUE);

CREATE POLICY "Authenticated users can create companies"
  ON companies FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Company creators can update their companies"
  ON companies FOR UPDATE
  USING (auth.uid() = created_by);

-- ============================================================
-- POSITIONS POLICIES
-- ============================================================

CREATE POLICY "Public positions are viewable"
  ON positions FOR SELECT
  USING (
    worker_id IN (SELECT id FROM workers WHERE is_public = TRUE)
  );

CREATE POLICY "Workers can view their own positions"
  ON positions FOR SELECT
  USING (
    worker_id IN (SELECT id FROM workers WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Workers can create their own positions"
  ON positions FOR INSERT
  WITH CHECK (
    worker_id IN (SELECT id FROM workers WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Workers can update their own positions"
  ON positions FOR UPDATE
  USING (
    worker_id IN (SELECT id FROM workers WHERE auth_user_id = auth.uid())
  );

-- ============================================================
-- QR TOKENS POLICIES
-- ============================================================

CREATE POLICY "QR tokens are publicly readable"
  ON qr_tokens FOR SELECT
  USING (TRUE);

CREATE POLICY "Workers can manage QR tokens for their positions"
  ON qr_tokens FOR ALL
  USING (
    position_id IN (
      SELECT p.id FROM positions p
      JOIN workers w ON w.id = p.worker_id
      WHERE w.auth_user_id = auth.uid()
    )
  );

-- ============================================================
-- REVIEWS POLICIES
-- ============================================================

CREATE POLICY "Public reviews are viewable"
  ON reviews FOR SELECT
  USING (
    position_id IN (
      SELECT p.id FROM positions p
      JOIN workers w ON w.id = p.worker_id
      WHERE w.is_public = TRUE
    )
  );

CREATE POLICY "Workers can see their own reviews"
  ON reviews FOR SELECT
  USING (
    position_id IN (
      SELECT p.id FROM positions p
      JOIN workers w ON w.id = p.worker_id
      WHERE w.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can submit reviews"
  ON reviews FOR INSERT
  WITH CHECK (TRUE);

-- NOTE: No UPDATE or DELETE policies — reviews are immutable

-- ============================================================
-- BADGES POLICIES
-- ============================================================

CREATE POLICY "Badges are publicly readable"
  ON badges FOR SELECT
  USING (TRUE);

-- ============================================================
-- WORKER BADGES POLICIES
-- ============================================================

CREATE POLICY "Worker badges are publicly readable"
  ON worker_badges FOR SELECT
  USING (TRUE);

-- ============================================================
-- COMPANY VERIFICATION REQUESTS POLICIES
-- ============================================================

CREATE POLICY "Users can view their own verification requests"
  ON company_verification_requests FOR SELECT
  USING (auth.uid() = submitted_by);

CREATE POLICY "Users can create verification requests"
  ON company_verification_requests FOR INSERT
  WITH CHECK (auth.uid() = submitted_by);

-- ============================================================
-- USER ROLES POLICIES
-- ============================================================

CREATE POLICY "Users can view their own roles"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update position rating and review count
CREATE OR REPLACE FUNCTION update_position_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE positions
  SET
    rating = (
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM reviews
      WHERE position_id = NEW.position_id
        AND is_flagged = FALSE
    ),
    review_count = (
      SELECT COUNT(*)
      FROM reviews
      WHERE position_id = NEW.position_id
        AND is_flagged = FALSE
    ),
    updated_at = NOW()
  WHERE id = NEW.position_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_position_rating
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_position_rating();

-- Auto-update worker overall rating (aggregate across all positions)
CREATE OR REPLACE FUNCTION update_worker_overall_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_worker_id UUID;
BEGIN
  -- Get the worker_id from the position
  SELECT worker_id INTO v_worker_id
  FROM positions
  WHERE id = NEW.position_id;
  
  -- Update worker's overall stats
  UPDATE workers
  SET
    overall_rating = (
      SELECT ROUND(AVG(r.rating)::numeric, 2)
      FROM reviews r
      JOIN positions p ON p.id = r.position_id
      WHERE p.worker_id = v_worker_id
        AND r.is_flagged = FALSE
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM reviews r
      JOIN positions p ON p.id = r.position_id
      WHERE p.worker_id = v_worker_id
        AND r.is_flagged = FALSE
    ),
    updated_at = NOW()
  WHERE id = v_worker_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_worker_overall_rating
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_worker_overall_rating();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_workers_updated_at
  BEFORE UPDATE ON workers
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trigger_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trigger_positions_updated_at
  BEFORE UPDATE ON positions
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- SEED: Badge Definitions
-- ============================================================

INSERT INTO badges (name, tier, category, criteria_json, description) VALUES

-- Volume badges
('First Review',     'bronze',   'volume',  '{"type":"review_count","threshold":1}',    'Received your very first customer review'),
('10 Reviews',       'bronze',   'volume',  '{"type":"review_count","threshold":10}',   'Collected 10 verified reviews'),
('50 Reviews',       'silver',   'volume',  '{"type":"review_count","threshold":50}',   'Built a solid portfolio with 50 reviews'),
('100 Reviews',      'gold',     'volume',  '{"type":"review_count","threshold":100}',  'Reached 100 verified reviews — a true pro'),
('500 Reviews',      'platinum', 'volume',  '{"type":"review_count","threshold":500}',  'An elite professional with 500+ reviews'),

-- Rating badges
('Rising Star',      'bronze',   'rating',  '{"type":"rating_threshold","threshold":4.5,"min_reviews":5}',   '4.5+ stars with at least 5 reviews'),
('Top Rated',        'silver',   'rating',  '{"type":"rating_threshold","threshold":4.7,"min_reviews":20}',  '4.7+ stars with at least 20 reviews'),
('Elite Pro',        'gold',     'rating',  '{"type":"rating_threshold","threshold":4.9,"min_reviews":50}',  '4.9+ stars with at least 50 reviews'),

-- Streak badges
('Consistent Pro',   'silver',   'streak',  '{"type":"streak","threshold":30,"consecutive":false}',  'No rating below 4.0 in last 30 reviews'),
('5-Star Streak',    'gold',     'streak',  '{"type":"streak","threshold":10,"consecutive":true}',   '10 consecutive 5-star reviews'),

-- Specialty
('TipTop Certified', 'platinum', 'specialty', '{"type":"manual"}', 'Verified and certified by the TipTop team')

ON CONFLICT DO NOTHING;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Function to check if email domain matches company
CREATE OR REPLACE FUNCTION verify_email_domain(
  p_email TEXT,
  p_company_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_email_domain TEXT;
  v_company_domain TEXT;
BEGIN
  -- Extract domain from email
  v_email_domain := LOWER(SPLIT_PART(p_email, '@', 2));
  
  -- Get company's email_domain
  SELECT email_domain INTO v_company_domain
  FROM companies
  WHERE id = p_company_id;
  
  -- Compare
  RETURN v_email_domain = v_company_domain AND v_company_domain IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- DONE
-- ============================================================
-- Next steps:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Verify tables created: SELECT * FROM companies;
-- 3. Deploy updated Next.js codebase
