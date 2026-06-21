// Centralised pipeline SLA constants — used by monitor cron and event handlers.
// All durations are in the natural unit for their use site (days or hours).

export const DISPATCH_SLA_DAYS       = 14;  // confirmed → ready_to_ship SLA
export const CUSTOMS_ENTRY_SLA_HOURS = 24;  // at_hub → customs filed SLA
export const DEMURRAGE_SLA_HOURS     = 48;  // customs filed → duties paid SLA
export const DISPUTE_WINDOW_HOURS    = 72;  // delivery → settlement hold window
