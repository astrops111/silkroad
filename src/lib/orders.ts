// supplier_order_items.product_id is NOT NULL but many order lines
// (RFQ/quote items) aren't tied to a catalog product — they're free-text
// entries a buyer typed in. This placeholder marks "no catalog product",
// distinct from a real (but missing) product row. There is no FK constraint
// on this column, so nothing enforces that consumers treat this specially —
// any code joining supplier_order_items to products by product_id must
// filter this value out first.
export const UNLINKED_PRODUCT_ID = "00000000-0000-0000-0000-000000000000";
