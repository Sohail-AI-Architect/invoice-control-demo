/**
 * Shared contract types between the two API routes and the UI.
 *
 * NOTE: types are shared, but the *decision rules are deliberately not*.
 * `app/api/check-invoice` (Maker) and `app/api/verify-invoice` (Checker) each
 * implement their own copy of the rules and their own field normalisation.
 * That mirrors the note at the bottom of
 * `.claude/agents/invoice-checker-verifier.md`:
 *
 *   "These rules are intentionally duplicated from the invoice-checker skill
 *    rather than read from it, so that verification does not depend on the
 *    file being audited."
 *
 * If both routes imported one shared `evaluate()`, the Checker could never
 * disagree with the Maker and this whole demo would prove nothing.
 */

/** The three verdicts, spelled exactly as SKILL.md spells them. */
export type Verdict = "APPROVE" | "FLAG" | "REVIEW NEEDED";

/** Raw, un-normalised invoice data — the only input either side is allowed. */
export interface RawInvoice {
  id: string;
  vendor: string;
  /** Exactly as it appears on the document, e.g. "$18,400.00". */
  amountRaw: string;
  /** Signature block contents, e.g. "J. Rahman, approved 2026-08-19" or "—". */
  signatureRaw: string;
  /** Free-text vendor history line, e.g. "on file since 2023". */
  vendorHistoryNote: string;
  /** Prior invoices on file. `null` means history was not supplied at all. */
  priorInvoiceCount: number | null;
  /** Date on the invoice, display only. */
  invoiceDate: string;
}

/** Fields either side derived for itself from the raw data. */
export interface DerivedFields {
  amount: number | null;
  signaturePresent: boolean;
  vendorIsNew: boolean | null;
}

/** Which numbered rule produced the verdict. */
export type RuleId = 1 | 2 | 3 | null;

/** POST body for /api/check-invoice */
export interface CheckRequest {
  invoice: RawInvoice;
  /**
   * Demo switch. When true the Maker returns a knowingly wrong APPROVE so you
   * can watch the Checker catch it. Never set by real callers.
   */
  simulateDishonest?: boolean;
}

/** Response from /api/check-invoice — the Maker's decision. */
export interface CheckResponse {
  invoiceId: string;
  verdict: Verdict;
  reason: string;
  rule: RuleId;
  derived: DerivedFields;
  /** True when this decision was fabricated by the dishonest-verdict switch. */
  dishonest: boolean;
  agent: "invoice-checker (skill)";
}

/** POST body for /api/verify-invoice */
export interface VerifyRequest {
  /** Raw data only. The Checker re-extracts every field from this. */
  invoice: RawInvoice;
  /** The decision under audit. Ignored while deriving; compared only at the end. */
  givenDecision: {
    verdict: Verdict;
    reason?: string;
  } | null;
}

/** Response from /api/verify-invoice — the Checker's audit result. */
export interface VerifyResponse {
  invoiceId: string;
  outcome: "MATCH" | "MISMATCH" | "NO_DECISION_SUPPLIED";
  /** The Checker's own verdict, derived before it looked at the decision. */
  derivedVerdict: Verdict;
  rule: RuleId;
  /** The single output line, formatted per the subagent's Output section. */
  line: string;
  reason: string;
  derived: DerivedFields;
  /** Set when rule 1 suppressed rule 2 — the audit trail the subagent requires. */
  overriddenRuleNote: string | null;
  agent: "invoice-checker-verifier (subagent)";
}
