const DESTINATION_COUNTRY_CODES = [
  "NG", "GH", "KE", "TZ", "ZA", "ET", "EG", "CM", "CI", "SN", "UG", "ZM", "CD", "MA",
  "MZ", "RW", "BJ", "AO", "MW", "ZW",
];

export const DESTINATION_COUNTRIES = DESTINATION_COUNTRY_CODES
  .map((code) => ({ code, name: new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code }))
  .sort((a, b) => a.name.localeCompare(b.name));
