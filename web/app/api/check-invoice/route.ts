import { NextResponse } from "next/server";

import type {
  CheckRequest,
  CheckResponse,
  DerivedFields,
  RawInvoice,
  RuleId,
  Verdict,
} from "@/lib/types";

/**
 * MAKER — TypeScript transcription of .claude/skills/invoice-checker/SKILL.md
 *
 * Decision rules, evaluated in order, first match wins:
 *   1. FLAG          — amount >= 10000 AND signature is missing
 *   2. REVIEW NEEDED — vendor is new (first-time vendor)
 *   3. APPROVE       — everything else
 *
 * Rule 1 outranks rule 2. The 10,000 threshold is INCLUSIVE.
 * A field that is genuinely unknown is never guessed → REVIEW NEEDED.
 *
 * This file has its own normalisers on purpose. See the header comment in
 * lib/types.ts for why nothing here is shared with the verifier route.
 */

const FLAG_THRESHOLD = 10_000;

/** "$18,400.00" → 18400. Returns null when no number can be read. */
function normaliseAmount(raw: string): number | null {
  if (typeof raw !== "string") return null;
  const stripped = raw.replace(/[^0-9.\-]/g, "");
  if (stripped === "" || stripped === "." || stripped === "-") return null;
  const value = Number.parseFloat(stripped);
  return Number.isFinite(value) ? value : null;
}

/**
 * Signature is MISSING when the block is absent, blank, an em/en dash, or says
 * unsigned / pending sign-off. PRESENT only when there is an actual signer.
 */
function isSignaturePresent(raw: string): boolean {
  if (typeof raw !== "string") return false;
  const value = raw.trim().toLowerCase();
  if (value === "") return false;

  const missingMarkers = ["—", "–", "-", "n/a", "na", "none", "null"];
  if (missingMarkers.includes(value)) return false;

  // Word-bounded on purpose: an unbounded "blank" would misread a signer named
  // "Blankenship", and "na" would misread "Donna", as an unsigned block.
  const missingPhrase =
    /\b(unsigned|not\s+signed|no\s+sign-?off|pending\s+sign-?off|pending\s+signature|awaiting\s+signature|signature\s+missing|blank)\b/;
  if (missingPhrase.test(value)) return false;

  return true;
}

/** null when history was not supplied — the caller must not guess. */
function resolveVendorIsNew(invoice: RawInvoice): boolean | null {
  if (invoice.priorInvoiceCount === null || invoice.priorInvoiceCount === undefined) {
    return null;
  }
  return invoice.priorInvoiceCount === 0;
}

interface Decision {
  verdict: Verdict;
  reason: string;
  rule: RuleId;
}

function decide(derived: DerivedFields): Decision {
  // Unknown fields are never guessed (SKILL.md, "Inputs to gather").
  if (derived.amount === null) {
    return {
      verdict: "REVIEW NEEDED",
      reason: "Invoice amount could not be read from the document, so it needs a human check.",
      rule: null,
    };
  }

  if (derived.vendorIsNew === null) {
    return {
      verdict: "REVIEW NEEDED",
      reason:
        "No vendor history was supplied, so whether this is a first-time vendor is unknown.",
      rule: null,
    };
  }

  // Rule 1 — inclusive threshold, and it outranks rule 2.
  if (derived.amount >= FLAG_THRESHOLD && !derived.signaturePresent) {
    const secondaryNote = derived.vendorIsNew
      ? " This is also a first-time vendor, but rule 1 takes priority."
      : "";
    return {
      verdict: "FLAG",
      reason: `Amount is $10,000 or more and the signature is missing (rule 1).${secondaryNote}`,
      rule: 1,
    };
  }

  // Rule 2
  if (derived.vendorIsNew) {
    return {
      verdict: "REVIEW NEEDED",
      reason: "First-time vendor, so it needs a human check before payment (rule 2).",
      rule: 2,
    };
  }

  // Rule 3
  const reason = derived.signaturePresent
    ? "Known vendor, signed, and under the $10,000 threshold (rule 3)."
    : "Known vendor and under the $10,000 threshold, so the missing signature does not trigger rule 1 (rule 3).";
  return { verdict: "APPROVE", reason, rule: 3 };
}

export async function POST(request: Request) {
  let body: CheckRequest;
  try {
    body = (await request.json()) as CheckRequest;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const invoice = body?.invoice;
  if (!invoice || typeof invoice !== "object" || typeof invoice.id !== "string") {
    return NextResponse.json(
      { error: "Body must include an `invoice` object with at least an `id`." },
      { status: 400 },
    );
  }

  const derived: DerivedFields = {
    amount: normaliseAmount(invoice.amountRaw),
    signaturePresent: isSignaturePresent(invoice.signatureRaw),
    vendorIsNew: resolveVendorIsNew(invoice),
  };

  const honest = decide(derived);

  // ---- Demo switch -------------------------------------------------------
  // With simulateDishonest on, the Maker reports APPROVE no matter what the
  // rules actually say, with a confident-sounding reason. The derived fields
  // it returns stay truthful, so the UI can show the contradiction, and the
  // Checker — which re-derives from raw data — is unaffected by any of it.
  if (body.simulateDishonest && honest.verdict !== "APPROVE") {
    const response: CheckResponse = {
      invoiceId: invoice.id,
      verdict: "APPROVE",
      reason:
        "Reviewed and cleared for payment — vendor relationship and documentation look fine (rule 3).",
      rule: 3,
      derived,
      dishonest: true,
      agent: "invoice-checker (skill)",
    };
    return NextResponse.json(response);
  }

  const response: CheckResponse = {
    invoiceId: invoice.id,
    verdict: honest.verdict,
    reason: honest.reason,
    rule: honest.rule,
    derived,
    dishonest: false,
    agent: "invoice-checker (skill)",
  };

  return NextResponse.json(response);
}
