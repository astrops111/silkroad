-- 00087_flutterwave_gateway_enum.sql — add 'flutterwave' to payment_gateway enum
--
-- Flutterwave is the primary pan-Africa payment aggregator (card, mobile
-- money, bank transfer). The TS GatewayType and gateway-registry already
-- treat it as preferred, but the enum backing payment_transactions.gateway
-- was never extended for it (only 'xtransfer' was, in 00071) — inserting
-- gateway = 'flutterwave' would fail without this.

ALTER TYPE payment_gateway ADD VALUE IF NOT EXISTS 'flutterwave';
