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
  /**
   * Self-serve checkout: the "Proceed to checkout" button on /cart, the
   * /checkout page itself, and order creation via POST /api/orders.
   *
   * Unlike the two flags above this is NOT display-only — the API route
   * rejects order creation while it is false, so a direct POST cannot slip
   * past the hidden button. With it off, the cart's only action is sending
   * an RFQ, and every deal goes through a quotation ops has priced.
   *
   * Flip to true to reopen self-serve ordering.
   */
  checkout: false,
};
