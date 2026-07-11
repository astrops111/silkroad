-- ============================================================
-- 00100_product_recommendations.sql — AI product recommendations
-- cache + feature flags for the recommender and the public
-- shopping assistant chatbot.
--
-- Signals come from product_deal_stats (00098) + category
-- affinity; semantic (pgvector) similarity is a future add —
-- the platform's AI vendor (Anthropic) has no embeddings API,
-- so introducing one would mean a new vendor decision.
-- ============================================================

CREATE TABLE IF NOT EXISTS product_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL CHECK (subject_type IN ('user', 'product', 'rfq')),
  subject_id uuid NOT NULL,
  recommended jsonb NOT NULL DEFAULT '[]',  -- [{product_id, score, reason}]
  computed_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  UNIQUE (subject_type, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_product_recommendations_expiry
  ON product_recommendations (expires_at);

ALTER TABLE product_recommendations ENABLE ROW LEVEL SECURITY;

-- These flags are buyer-facing (catalog recommendations, shopping chatbot),
-- a category the original enum (00031_ai_feature_flags.sql) didn't anticipate.
ALTER TABLE ai_feature_flags DROP CONSTRAINT IF EXISTS ai_feature_flags_category_check;
ALTER TABLE ai_feature_flags ADD CONSTRAINT ai_feature_flags_category_check
  CHECK (category IN ('seller_tools', 'support', 'trust_safety', 'operations', 'buyer_tools'));

-- Serving is done by API routes using the service client; the cache
-- holds only public catalog data, so authenticated reads are safe.
CREATE POLICY "Authenticated read recommendations" ON product_recommendations
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage recommendations" ON product_recommendations
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

INSERT INTO ai_feature_flags (id, name, description, category, is_enabled, config)
VALUES
  (
    'product_recommendations',
    'AI Product Recommendations',
    'Related-product and buyer-personalized recommendations from RFQ/order co-demand and category affinity, optionally re-ranked by Claude.',
    'buyer_tools',
    false,
    '{"model": "claude-sonnet-4-20250514", "cacheTtlHours": 24, "aiRerank": false}'::jsonb
  ),
  (
    'shopping_assistant',
    'AI Shopping Assistant',
    'Public chatbot that answers product questions, recommends what to buy, and explains how the marketplace works. No access to accounts or orders by design.',
    'buyer_tools',
    false,
    '{"model": "claude-sonnet-4-20250514", "maxTurns": 20}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;
