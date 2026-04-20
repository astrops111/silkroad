-- ============================================================
-- 00019_ai_feature_flags.sql — Admin-controlled AI feature toggles
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_feature_flags (
  id TEXT PRIMARY KEY, -- e.g. 'ai_listing_generator', 'ai_support_agent'
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('seller_tools', 'support', 'trust_safety', 'operations')),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  config JSONB DEFAULT '{}', -- feature-specific configuration
  updated_by UUID REFERENCES user_profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_flags_category ON ai_feature_flags(category);
CREATE INDEX IF NOT EXISTS idx_ai_flags_enabled ON ai_feature_flags(is_enabled);

-- Seed all AI features (disabled by default — admin must opt in)
INSERT INTO ai_feature_flags (id, name, description, category, is_enabled, config) VALUES
  (
    'ai_listing_generator',
    'AI Listing Generator',
    'Sellers upload product photos and AI generates descriptions, specs, categories, and tags in all 12 platform languages.',
    'seller_tools',
    false,
    '{"max_images": 5, "languages": ["en","fr","zh-CN","sw","ar","ha","yo","am","zu","pt","lg","rw"]}'
  ),
  (
    'ai_pricing_engine',
    'Smart Pricing Recommendations',
    'AI suggests competitive pricing based on market position, competitor listings, and regional purchasing power with PPP adjustments.',
    'seller_tools',
    false,
    '{"default_markets": ["KE","NG","GH","ZA","UG","TZ"]}'
  ),
  (
    'ai_support_agent',
    'AI Customer Support Agent',
    'Multilingual AI support handling order tracking, dispute triage, and payment status queries across mobile money providers.',
    'support',
    false,
    '{"max_messages_per_session": 20, "handoff_threshold": 3}'
  ),
  (
    'ai_dispute_resolution',
    'AI Dispute Resolution',
    'AI-assisted mediation analyzing transaction records, chat history, and delivery proof to recommend fair dispute outcomes.',
    'trust_safety',
    false,
    '{"auto_resolve": false, "confidence_threshold": 0.85}'
  ),
  (
    'ai_compliance_scanner',
    'Regulatory Compliance Scanner',
    'Auto-flag products and transactions that may violate import/export regulations for specific country pairs.',
    'trust_safety',
    false,
    '{"scan_on_product_create": true, "scan_on_order_create": true, "blocked_categories": []}'
  ),
  (
    'ai_route_optimizer',
    'Route Optimization',
    'AI-powered delivery route planning — minimize distance, fuel consumption, and delivery time for the platform fleet.',
    'operations',
    false,
    '{"default_strategy": "balanced"}'
  );
