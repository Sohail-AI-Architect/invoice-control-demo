import { NextResponse } from "next/server";

import type {
  DerivedFields,
  RawInvoice,
  RuleId,
  Verdict,
  VerifyRequest,
  VerifyResponse,
} from "@/lib/types";

/**
 * CHECKER — TypeScript transcription of
 * .claude/agents/invoice-checker-verifier.md
 *
 * Core rule: never trust the given decision. It is evidence of nothing.
 *
 * This route therefore:
 *   1. re-extracts every field from the raw invoice data itself,
 *   2. derives its own verdict,
 *   3. and only THEN looks at `givenDecision` to compare.
 *
 * The given verdict is not read anywhere above the "Step 3" marker below, and
 * none of the Maker's normalised numbers are accepted as input — the request
 * body has no field to pass them in. The normalisers here are written
 * independently of the ones in ../check-invoice/route.ts, by design.
 */

const FLAG_THRESHOLD = 10_000;

/**
 * Pull the first monetary figure out of the raw string and normalise it.
 * Implemented by matching the number pattern rather than stripping characters,
 * so it fails loudly (null) on input with no readable figure.
 */
function extractAmount(raw: unknown): number | null {
  if (typeof raw !== "string") return null;
  const match = raw.match(/-?\d[\d, \s]*(?:\.\d+)?/);
  if (!match) return null;
  const cleaned = match[0].replace(/[, \s]/g, "");
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? value : null;
}

/**
 * MISSING if the block is absent, blank, a dash, or says unsigned / pending
 * sign-off. PRESENT only when an actual signer is named.
 */
function extractSignaturePresent(raw: unknown): boolean {
  if (typeof raw !== "string") return false;
  const value = raw.trim().toLowerCase();
  if (value.length === 0) return false;

  // Dashes and placeholder glyphs only → nothing was signed.
  if (/^[\s—–\-_.*]+$/.test(value)) return false;

  // Word-bounded on purpose: unbounded alternatives would misread real signer
  // names ("Donna" contains "na", "Blankenship" contains "blank") as unsigned.
  const unsignedPattern =
    /\b(unsigned|not\s+signed|no\s+sign-?off|pending\s+sign-?off|pending\s+signature|awaiting\s+sign(?:ature)?|signature\s+(?:missing|pending)|missing|blank|none|na|n\/a)\b/;
  if (unsignedPattern.test(value)) return false;

  // A real signature block names somebody — require at least one letter.
  return /[a-z]/.test(value);
}

/**
 * New vendor decided from the raw history evidence: the prior-invoice count and
 * the free-text history note are both re-read here. Returns null only when
 * neither source says anything usable, in which case the verdict is
 * REVIEW NEEDED rather than a guess.
 */
function extractVendorIsNew(invoice: RawInvoice): boolean | null {
  const note = typeof invoice.vendorHistoryNote === "string"
    ? invoice.vendorHistoryNote.trim().toLowerCase()
    : "";

  const saysNew =
    /(first\s+invoice|first-time|no\s+prior\s+invoice|new\s+vendor|never\s+invoiced)/.test(note);
  const saysKnown = /(on\s+file|prior\s+invoices?|since\s+\d{4}|existing\s+vendor)/.test(note);

  const count = invoice.priorInvoiceCount;
  const hasCount = typeof count === "number" && Number.isFinite(count);

  if (hasCount) {
    const newByCount = (count as number) === 0;
    // Count is the harder evidence; the note only fills in when there is none.
    return newByCount;
  }

  if (saysNew && !saysKnown) return true;
  if (saysKnown && !saysNew) return false;

  return null;
}

/** 18400 → "18400", 2315.5 → "2315.5" — matches the subagent's reason style. */
function bare(amount: number): string {
  return String(amount);
}

interface Derivation {
  verdict: Verdict;
  rule: RuleId;
  reason: string;
  /** Non-null when rule 1 suppressed rule 2 (the only overlap that exists). */
  overriddenRuleNote: string | null;
}

/** Step 2 — apply the rules. First match wins; rule 1 outranks rule 2. */
function deriveVerdict(derived: DerivedFields): Derivation {
  if (derived.amount === null) {
    return {
      verdict: "REVIEW NEEDED",
      rule: null,
      reason: "amount raw data se padha nahi ja saka, field missing hai",
      overriddenRuleNote: null,
    };
  }

  if (derived.vendorIsNew === null) {
    return {
      verdict: "REVIEW NEEDED",
      rule: null,
      reason:
        "vendor history supply nahi hui, is liye vendor naya hai ya nahi yeh pata nahi chalta (vendor_is_new field missing hai)",
      overriddenRuleNote: null,
    };
  }

  const amountText = bare(derived.amount);

  // Rule 1 — threshold is inclusive.
  if (derived.amount >= FLAG_THRESHOLD && !derived.signaturePresent) {
    const overriddenRuleNote = derived.vendorIsNew
      ? "rule 2 bhi applicable tha, vendor naya hai, par rule 1 ne override kiya"
      : null;
    return {
      verdict: "FLAG",
      rule: 1,
      reason: `amount ${amountText} hai (>= 10000) aur signature missing hai, rule 1 lagta hai`,
      overriddenRuleNote,
    };
  }

  // Rule 2
  if (derived.vendorIsNew) {
    return {
      verdict: "REVIEW NEEDED",
      rule: 2,
      reason: "vendor naya hai (pehla invoice hai), rule 2 lagta hai",
      overriddenRuleNote: null,
    };
  }

  // Rule 3
  const signatureText = derived.signaturePresent
    ? "signature present hai"
    : "signature missing hai par amount threshold se neeche hai, is liye rule 1 nahi laga";
  return {
    verdict: "APPROVE",
    rule: 3,
    reason: `vendor known hai, amount ${amountText} hai (10000 se kam), ${signatureText}, rule 3 lagta hai`,
    overriddenRuleNote: null,
  };
}

export async function POST(request: Request) {
  let body: VerifyRequest;
  try {
    body = (await request.json()) as VerifyRequest;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const invoice = body?.invoice;

  // "Only the given decision was supplied, no raw data: you cannot verify
  //  anything. Never pass a decision through unverified."
  if (!invoice || typeof invoice !== "object" || typeof invoice.id !== "string") {
    return NextResponse.json(
      {
        error:
          "Raw invoice data is missing, so nothing can be verified. Send `invoice` with the raw fields.",
      },
      { status: 400 },
    );
  }

  // ---- Step 1 — extract raw fields ourselves -----------------------------
  const derived: DerivedFields = {
    amount: extractAmount(invoice.amountRaw),
    signaturePresent: extractSignaturePresent(invoice.signatureRaw),
    vendorIsNew: extractVendorIsNew(invoice),
  };

  // ---- Step 2 — derive our own verdict, given decision still unread ------
  const derivation = deriveVerdict(derived);

  // ---- Step 3 — only now look at the decision under audit ----------------
  const given = body.givenDecision ?? null;

  if (!given || typeof given.verdict !== "string") {
    const response: VerifyResponse = {
      invoiceId: invoice.id,
      outcome: "NO_DECISION_SUPPLIED",
      derivedVerdict: derivation.verdict,
      rule: derivation.rule,
      line: `No decision supplied to compare against. Derived verdict: ${derivation.verdict} — ${derivation.reason}`,
      reason: derivation.reason,
      derived,
      overriddenRuleNote: derivation.overriddenRuleNote,
      agent: "invoice-checker-verifier (subagent)",
    };
    return NextResponse.json(response);
  }

  const matches = given.verdict === derivation.verdict;

  // Output format per the subagent's Output section, including the
  // overridden-rule audit note on BOTH outcomes.
  let line: string;
  if (matches) {
    line = derivation.overriddenRuleNote
      ? `MATCH — decision sahi hai (rule ${derivation.rule} laga; ${derivation.overriddenRuleNote})`
      : "MATCH — decision sahi hai";
  } else {
    const withOverride = derivation.overriddenRuleNote
      ? `${derivation.reason} (${derivation.overriddenRuleNote})`
      : derivation.reason;
    line = `MISMATCH — ${withOverride}, sahi decision yeh honi chahiye: ${derivation.verdict}`;
  }

  const response: VerifyResponse = {
    invoiceId: invoice.id,
    outcome: matches ? "MATCH" : "MISMATCH",
    derivedVerdict: derivation.verdict,
    rule: derivation.rule,
    line,
    reason: derivation.reason,
    derived,
    overriddenRuleNote: derivation.overriddenRuleNote,
    agent: "invoice-checker-verifier (subagent)",
  };

  return NextResponse.json(response);
}
