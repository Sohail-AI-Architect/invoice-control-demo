import type { RawInvoice } from "./types";

import invoiceData from "./invoices.json";

/**
 * Sample invoice queue — the single source of truth, shared with
 * `scripts/smoke.mjs` via the JSON file so the test data can never drift from
 * what the UI displays.
 *
 * Each row is chosen to make one rule path obvious at a glance:
 *
 *   NL-4471  Nordway Logistics AB   $18,400  unsigned, known vendor
 *            → FLAG (rule 1). The plain, unambiguous high-value/no-signature case.
 *
 *   PC-0092  Petal & Co Catering    $840     signed, first-ever invoice
 *            → REVIEW NEEDED (rule 2). Small and properly signed, held purely
 *              because the vendor has no history.
 *
 *   AO-1130  Acme Office Supply     $2,315   signed, 12 prior invoices
 *            → APPROVE (rule 3). The clean baseline — nothing abnormal.
 *
 *   HF-2287  Halcyon Freight Group  $10,000  unsigned, new vendor
 *            → FLAG (rule 1). Two edge cases in one row: the threshold is
 *              INCLUSIVE so exactly $10,000 trips it, and rule 1 OVERRIDES the
 *              rule 2 that the new vendor would otherwise trigger. The checker
 *              must report that override in its audit trail.
 *
 *   BM-5510  Brightline Media       $9,500   unsigned, known vendor
 *            → APPROVE (rule 3). The near-miss: unsigned, but $500 under the
 *              threshold, so rule 1 does not fire. Proves the rule reads the
 *              amount and the signature together, not either one alone.
 *
 * Amounts and signature blocks are stored exactly as they would appear on the
 * document (currency symbols, separators, em-dash and "pending sign-off"
 * signature blocks) so that both API routes must normalise them independently.
 */
export const SAMPLE_INVOICES: RawInvoice[] = invoiceData;
