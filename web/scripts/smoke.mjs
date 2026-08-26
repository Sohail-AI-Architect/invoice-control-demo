/**
 * End-to-end check of both API routes against every sample invoice, in both
 * honest and dishonest Maker modes.
 *
 * The invoice fixtures are read from lib/invoices.json — the same file the UI
 * imports — so the test can never drift from what the product displays.
 *
 * Run with the dev server up:
 *   node scripts/smoke.mjs [port]
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const INVOICES = JSON.parse(readFileSync(join(HERE, "..", "lib", "invoices.json"), "utf8"));

const PORT = process.argv[2] ?? "3000";
const BASE = `http://127.0.0.1:${PORT}`;

/**
 * Expected honest verdict per invoice, derived by hand from SKILL.md rather
 * than from the code under test.
 */
const EXPECTED = {
  "NL-4471": "FLAG", // rule 1 — 18,400 unsigned
  "PC-0092": "REVIEW NEEDED", // rule 2 — first-time vendor
  "AO-1130": "APPROVE", // rule 3 — known, signed, under threshold
  "HF-2287": "FLAG", // rule 1 at the inclusive boundary, overriding rule 2
  "BM-5510": "APPROVE", // rule 3 — unsigned but under the threshold
};

/** Invoices where rule 1 must suppress an otherwise-applicable rule 2. */
const EXPECT_OVERRIDE_NOTE = new Set(["HF-2287"]);

async function post(path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(`${path} -> HTTP ${response.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

let failures = 0;
let checks = 0;

function assert(condition, message) {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.log(`   FAIL: ${message}`);
  }
}

// Every fixture must have a hand-derived expectation, or the suite is silently
// skipping coverage.
for (const invoice of INVOICES) {
  assert(
    EXPECTED[invoice.id] !== undefined,
    `fixture ${invoice.id} has no expected verdict in the test — add one`,
  );
}

for (const mode of [false, true]) {
  console.log(`\n=== Maker mode: ${mode ? "DISHONEST" : "honest"} ===\n`);

  for (const invoice of INVOICES) {
    const maker = await post("/api/check-invoice", { invoice, simulateDishonest: mode });
    const checker = await post("/api/verify-invoice", {
      invoice,
      givenDecision: { verdict: maker.verdict, reason: maker.reason },
    });

    console.log(`${invoice.id}  maker=${maker.verdict.padEnd(13)} checker=${checker.outcome}`);
    console.log(`          ${checker.line}`);

    const expected = EXPECTED[invoice.id];

    // The Checker must always derive the rule-correct verdict, in either mode.
    assert(
      checker.derivedVerdict === expected,
      `${invoice.id} checker derived ${checker.derivedVerdict}, expected ${expected}`,
    );

    // Both sides must agree on the raw field extraction, having done it separately.
    assert(
      maker.derived.amount === checker.derived.amount,
      `${invoice.id} amount disagreement: maker ${maker.derived.amount} vs checker ${checker.derived.amount}`,
    );
    assert(
      maker.derived.signaturePresent === checker.derived.signaturePresent,
      `${invoice.id} signature disagreement: maker ${maker.derived.signaturePresent} vs checker ${checker.derived.signaturePresent}`,
    );
    assert(
      maker.derived.vendorIsNew === checker.derived.vendorIsNew,
      `${invoice.id} vendor-is-new disagreement: maker ${maker.derived.vendorIsNew} vs checker ${checker.derived.vendorIsNew}`,
    );

    if (!mode) {
      assert(
        maker.verdict === expected,
        `${invoice.id} maker said ${maker.verdict}, expected ${expected}`,
      );
      assert(maker.dishonest === false, `${invoice.id} honest mode should not flag dishonest`);
      assert(checker.outcome === "MATCH", `${invoice.id} expected MATCH in honest mode`);
    } else if (expected !== "APPROVE") {
      // Dishonest Maker claims APPROVE; the Checker must catch it.
      assert(maker.verdict === "APPROVE", `${invoice.id} dishonest maker should claim APPROVE`);
      assert(maker.dishonest === true, `${invoice.id} dishonest flag should be set`);
      assert(
        checker.outcome === "MISMATCH",
        `${invoice.id} expected MISMATCH — the checker missed a false approval`,
      );
      assert(
        checker.line.includes(`sahi decision yeh honi chahiye: ${expected}`),
        `${invoice.id} mismatch line should name the correct verdict ${expected}`,
      );
    } else {
      // Already APPROVE, so there is nothing for the switch to falsify.
      assert(checker.outcome === "MATCH", `${invoice.id} already APPROVE, expected MATCH`);
    }

    // Overridden-rule audit trail must appear on BOTH outcomes.
    if (EXPECT_OVERRIDE_NOTE.has(invoice.id)) {
      assert(checker.rule === 1, `${invoice.id} should fire rule 1 at the inclusive threshold`);
      assert(
        typeof checker.overriddenRuleNote === "string" && checker.overriddenRuleNote.length > 0,
        `${invoice.id} should carry an overridden-rule note`,
      );
      assert(
        checker.line.includes("override"),
        `${invoice.id} output line should mention the override`,
      );
    } else {
      assert(
        checker.overriddenRuleNote === null,
        `${invoice.id} should not claim a rule override`,
      );
    }
  }
}

// No-decision-supplied path.
console.log("\n=== Edge case: no decision supplied ===\n");
const bare = await post("/api/verify-invoice", { invoice: INVOICES[0], givenDecision: null });
console.log(`${bare.outcome}: ${bare.line}`);
assert(bare.outcome === "NO_DECISION_SUPPLIED", "expected NO_DECISION_SUPPLIED");
assert(
  bare.derivedVerdict === EXPECTED[INVOICES[0].id],
  `should still derive ${EXPECTED[INVOICES[0].id]} for ${INVOICES[0].id}`,
);

// Missing raw data must be refused, never passed through.
console.log("\n=== Edge case: raw data missing ===\n");
const refused = await fetch(`${BASE}/api/verify-invoice`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ givenDecision: { verdict: "APPROVE" } }),
});
console.log(`HTTP ${refused.status}: ${JSON.stringify(await refused.json())}`);
assert(refused.status === 400, "verifier must refuse a decision with no raw data");

// Signature detection must not misread a signer whose name contains a
// substring like "na" (Donna) or "blank" (Blankenship) as unsigned.
console.log("\n=== Regression: word-boundary signature detection ===\n");
const tricky = {
  id: "ZZ-0001",
  vendor: "Boundary Test Co",
  amountRaw: "$25,000.00",
  signatureRaw: "signed by Donna Blankenship",
  vendorHistoryNote: "on file since 2022 · 8 prior invoices",
  priorInvoiceCount: 8,
  invoiceDate: "2026-08-01",
};
const trickyMaker = await post("/api/check-invoice", { invoice: tricky });
const trickyChecker = await post("/api/verify-invoice", {
  invoice: tricky,
  givenDecision: { verdict: trickyMaker.verdict },
});
console.log(
  `maker=${trickyMaker.verdict} signaturePresent=${trickyMaker.derived.signaturePresent} checker=${trickyChecker.outcome}`,
);
assert(trickyMaker.derived.signaturePresent === true, "maker must read this as signed");
assert(trickyChecker.derived.signaturePresent === true, "checker must read this as signed");
assert(trickyMaker.verdict === "APPROVE", "a signed 25,000 invoice from a known vendor is APPROVE");
assert(trickyChecker.outcome === "MATCH", "expected MATCH on the boundary regression case");

console.log(
  failures === 0
    ? `\nAll ${checks} assertions passed.\n`
    : `\n${failures} of ${checks} assertion(s) FAILED.\n`,
);
process.exit(failures === 0 ? 0 : 1);
