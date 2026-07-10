-- ============================================================
-- 00092_disable_paid_tier_gates.sql — Disable plan-tier paywall (temporary)
-- Product decision: RFQ creation and quotation submission on the Resources
-- portal should be free for all companies for now, regardless of tier.
-- Rather than dropping the 00041 policies, we relax the predicate they call
-- so re-enabling the paywall later is a one-line revert of this function.
-- ============================================================

CREATE OR REPLACE FUNCTION is_paid_member(company UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT TRUE;
$$;

COMMENT ON FUNCTION is_paid_member(UUID) IS
  'Plan-tier gating disabled for now — always TRUE. Restore the tier check '
  '(tier IN (''standard'',''gold'') AND not expired) to re-enable the paywall.';
