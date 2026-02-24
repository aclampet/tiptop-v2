-- ============================================================
-- Harden reviews INSERT RLS (SELECT remains public)
-- ============================================================
-- INSERT: only if qr_token exists, is_active, and matches position_id

DROP POLICY IF EXISTS "Anyone can submit reviews" ON reviews;

CREATE POLICY "Allow review insert only for valid active QR token"
  ON reviews FOR INSERT
  WITH CHECK (
    qr_token_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM qr_tokens qt
      WHERE qt.id = reviews.qr_token_id
        AND qt.is_active = true
        AND qt.position_id = reviews.position_id
    )
  );
