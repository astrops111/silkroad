/**
 * Temporary UI visibility switches for the newly-wired checkout features.
 * Flip to true to re-enable — the underlying endpoints/logic (payment-terms
 * PATCH, deposit-aware charge resolution, POST /api/orders) stay fully
 * wired either way; these only control whether buyers see the entry points.
 */
export const CHECKOUT_FEATURES = {
  /** PaymentTermsSelector step (deposit/net-30/net-60) on /orders/[id]/pay */
  paymentTerms: false,
  /** "Buy Now" instant-checkout button on the product detail page */
  buyNow: false,
};
