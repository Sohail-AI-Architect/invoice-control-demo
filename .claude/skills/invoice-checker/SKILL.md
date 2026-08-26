---
name: invoice-checker
description: Review an invoice and decide APPROVE, FLAG, or REVIEW NEEDED based on amount, signature, and vendor history. Use whenever the user asks to check, review, validate, screen, or approve an invoice or bill, or asks "should I pay this invoice?" — including batches of invoices.
---

# Invoice Checker

Decide one of three verdicts for an invoice: **APPROVE**, **FLAG**, or **REVIEW NEEDED**.

## Inputs to gather

Pull these from whatever the user provides (pasted text, PDF, image, CSV row, or JSON):

| Field | Meaning |
| --- | --- |
| `amount` | Invoice total. Normalize currency symbols and separators (`$12,500.00` → `12500`). |
| `signature` | Present or missing. Treat "unsigned", "no sign-off", blank signature block, or absent field as **missing**. |
| `vendor` | Vendor name. |
| `vendor_is_new` | True if this is the vendor's first invoice — no prior invoice, no entry in the vendor list/history the user supplied. |

If a field needed by a rule is genuinely unknown (e.g. you cannot tell whether the vendor is new because no history was provided), do **not** guess. Return `REVIEW NEEDED` and say which field was missing.

## Decision rules

Evaluate in this order and stop at the first match:

1. **FLAG** — `amount >= 10000` **AND** `signature` is missing.
2. **REVIEW NEEDED** — vendor is new (first-time vendor).
3. **APPROVE** — everything else looks normal.

**Precedence note:** rule 1 wins over rule 2. An invoice at or over $10,000 with a missing signature from a brand-new vendor is `FLAG`, not `REVIEW NEEDED` — the more severe verdict takes priority. Mention the new-vendor fact as a secondary note in the reasoning.

Boundary: the threshold is **inclusive**. `$10,000.00` exactly **does** trigger rule 1 — a missing signature at exactly $10,000 is `FLAG`.

## Output format

Report each invoice like this:

```
Invoice: <invoice id or vendor + date>
Vendor:  <vendor name> (new | known)
Amount:  <normalized amount>
Signed:  <yes | no>

Verdict: <APPROVE | FLAG | REVIEW NEEDED>
Reason:  <one sentence naming the rule that fired>
```

For multiple invoices, output one block per invoice, then a one-line tally
(e.g. `3 invoices: 1 APPROVE, 1 FLAG, 1 REVIEW NEEDED`).

Keep the reason to one sentence. Do not add recommendations beyond the verdict unless asked.

## Examples

### Example 1 — FLAG (rule 1)

Input:
```
Invoice #A-4471, Vendor: Nordway Logistics (on file since 2023)
Amount: $18,400.00
Signature: —
```

Output:
```
Invoice: A-4471
Vendor:  Nordway Logistics (known)
Amount:  18400
Signed:  no

Verdict: FLAG
Reason:  Amount is $10,000 or more and the signature is missing (rule 1).
```

### Example 2 — REVIEW NEEDED (rule 2)

Input:
```
Invoice #B-0092, Vendor: Petal & Co Catering — first invoice from this vendor
Amount: $840.00
Signature: J. Rahman, approved 2026-08-19
```

Output:
```
Invoice: B-0092
Vendor:  Petal & Co Catering (new)
Amount:  840
Signed:  yes

Verdict: REVIEW NEEDED
Reason:  First-time vendor, so it needs a human check before payment (rule 2).
```

### Example 3 — APPROVE (rule 3)

Input:
```
Invoice #C-1130, Vendor: Acme Office Supply (12 prior invoices)
Amount: $2,315.50
Signature: signed by M. Osei
```

Output:
```
Invoice: C-1130
Vendor:  Acme Office Supply (known)
Amount:  2315.5
Signed:  yes

Verdict: APPROVE
Reason:  Known vendor, signed, and under the $10,000 threshold (rule 3).
```
