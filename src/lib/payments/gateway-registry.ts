import type { PaymentGateway, GatewayType } from "./types";
import { flutterwaveGateway } from "./gateways/flutterwave";
import { mtnMomoGateway } from "./gateways/mtn-momo";
import { airtelMoneyGateway } from "./gateways/airtel-money";
import { stripeGateway } from "./gateways/stripe";
import { wechatPayGateway } from "./gateways/wechat-pay";
import { alipayGateway } from "./gateways/alipay";
import { tigoCashGateway } from "./gateways/tigo-cash";

const gateways: Record<string, PaymentGateway> = {
  flutterwave: flutterwaveGateway,  // pan-Africa aggregator (preferred)
  mtn_momo: mtnMomoGateway,         // direct MTN (fallback)
  airtel_money: airtelMoneyGateway, // direct Airtel (fallback)
  tigo_cash: tigoCashGateway,       // Tigo Pesa (TZ, GH, RW)
  stripe: stripeGateway,
  wechat_pay: wechatPayGateway,
  alipay: alipayGateway,
};

/**
 * Get a payment gateway by type
 */
export function getGateway(type: GatewayType): PaymentGateway {
  const gateway = gateways[type];
  if (!gateway) {
    throw new Error(`Payment gateway "${type}" is not registered`);
  }
  return gateway;
}

/**
 * Get the recommended gateway for a country + payment method
 */
export function getRecommendedGateway(
  countryCode: string,
  preferredMethod?: string
): GatewayType {
  // If user explicitly chose a method, use it
  if (preferredMethod && gateways[preferredMethod]) {
    return preferredMethod as GatewayType;
  }

  // African countries → Flutterwave (single aggregator for MTN, Airtel, Tigo, M-Pesa, card)
  const africanCountries = new Set([
    "GH", "NG", "KE", "TZ", "UG", "RW", "ZM", "CM", "CI", "BJ",
    "CG", "GN", "CD", "MW", "MG", "SN", "ZW", "LR", "SL", "ET",
    "MZ", "AO", "EG", "MA", "TN", "ZA", "SD",
  ]);
  if (africanCountries.has(countryCode)) return "flutterwave";

  // China
  if (countryCode === "CN") return "wechat_pay";

  // Default to Stripe (cards / international)
  return "stripe";
}

/**
 * Get all available gateways for a country
 */
export function getAvailableGateways(countryCode: string): GatewayType[] {
  const available: GatewayType[] = [];

  const africanCountries = new Set([
    "GH", "NG", "KE", "TZ", "UG", "RW", "ZM", "CM", "CI", "BJ",
    "CG", "GN", "CD", "MW", "MG", "SN", "ZW", "LR", "SL", "ET",
    "MZ", "AO", "EG", "MA", "TN", "ZA", "SD",
  ]);

  // Flutterwave handles all African mobile money + card
  if (africanCountries.has(countryCode)) available.push("flutterwave");

  if (countryCode === "CN") {
    available.push("wechat_pay", "alipay");
  }

  // Stripe & bank transfer always available for international B2B
  available.push("stripe", "bank_transfer");

  return available;
}

/**
 * Register a new gateway (for plugins / future gateways)
 */
export function registerGateway(
  type: string,
  gateway: PaymentGateway
): void {
  gateways[type] = gateway;
}
