-- Add AI HS Code Classifier feature flag
INSERT INTO ai_feature_flags (id, name, description, category, is_enabled, config)
VALUES (
  'ai_hs_classifier',
  'AI HS Code Classification',
  'AI-powered classification of product descriptions into Harmonized System (HS) codes, used to suggest a product''s hs_code during listing.',
  'seller_tools',
  false,
  '{"min_confidence_pct": 60}'
)
ON CONFLICT (id) DO NOTHING;
