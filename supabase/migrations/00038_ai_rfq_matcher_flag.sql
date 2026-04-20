-- Add AI RFQ Matcher feature flag
INSERT INTO ai_feature_flags (id, name, description, category, is_enabled, config)
VALUES (
  'ai_rfq_matcher',
  'AI Supplier Matching for RFQs',
  'AI-powered matching of buyer RFQs to the most suitable suppliers based on product fit, pricing, reliability, and certifications.',
  'seller_tools',
  false,
  '{"max_candidates": 50, "min_match_score": 60}'
)
ON CONFLICT (id) DO NOTHING;
