const PEXELS = (id: string, w = 900) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

export const CATEGORY_IMAGE_BY_SLUG: Record<string, string> = {
  // Top-level
  home: PEXELS("276583"),
  hotels: "/hotels-cat.jpg",
  "consumer-electronics": "/electronic-cat.jpg",
  beauty: PEXELS("6663369"),
  groceries: "/groceries-cat.jpg",
  "baby-products": PEXELS("3933250"),

  // Home
  "home-decor": PEXELS("1866149"),
  "home-furniture": PEXELS("276583"),
  "home-supplies": PEXELS("4239037"),
  "home-fragrance": PEXELS("4207891"),
  "home-kitchen": PEXELS("6489663"),
  "home-bedroom": PEXELS("1454806"),
  "home-bathroom": PEXELS("6207819"),
  "home-outdoors": PEXELS("2079249"),

  // Hotels
  "hotel-bath": PEXELS("342800"),
  "hotel-beds": PEXELS("271618"),
  "hotel-furnishing": PEXELS("1571460"),
  "hotel-decor": PEXELS("1571453"),

  // Consumer Electronics
  "home-appliance": PEXELS("4108715"),
  computer: PEXELS("177707"),
  "computer-peripherals": PEXELS("2115257"),

  // Beauty
  "beauty-facial": PEXELS("3373736"),
  "beauty-body": PEXELS("3735641"),
  "beauty-hair": PEXELS("3993449"),
  "beauty-tools": PEXELS("2113855"),

  // Beauty › Facial
  "facial-cleaning": PEXELS("3785147"),
  "facial-cream": PEXELS("3737605"),
  "facial-sprays": PEXELS("4465124"),
  "facial-masks": PEXELS("3762879"),

  // Beauty › Body
  "body-cleaning": PEXELS("4041392"),
  "body-cream": PEXELS("6621462"),
  "body-sun-protection": PEXELS("5069432"),
  "body-fragrance": PEXELS("3059609"),

  // Beauty › Hair
  "hair-shampoo": PEXELS("3738337"),
  "hair-conditioner": PEXELS("3993454"),
  "hair-dye": PEXELS("3993443"),
  "hair-removal": PEXELS("3997379"),
  "hair-accessories": PEXELS("1164985"),

  // Groceries
  "snacks-sweets": PEXELS("1055272"),
  "snacks-savoury": PEXELS("1093818"),
  drink: PEXELS("50593"),
  "canned-goods": PEXELS("264636"),
  frozen: PEXELS("5945838"),

  // Baby
  diapers: PEXELS("3933250"),
  "baby-formula": PEXELS("6849368"),
};

export const CATEGORY_FALLBACK_IMAGE = PEXELS("4481259");

export function imageForSlug(slug: string | null | undefined): string {
  if (!slug) return CATEGORY_FALLBACK_IMAGE;
  return CATEGORY_IMAGE_BY_SLUG[slug] ?? CATEGORY_FALLBACK_IMAGE;
}
