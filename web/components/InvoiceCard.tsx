"use client";

import type { RawInvoice } from "@/lib/types";
import { cx, formatAmount } from "@/lib/format";

/** Cheap client-side read of the raw amount, for list display only. */
function displayAmount(raw: string): string {
  const value = Number.parseFloat(raw.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(value) ? formatAmount(value) : raw;
}

/**
 * Signed / unsigned label for the list row only — the authoritative call is
 * made server-side by each API route. Word-bounded so signer names containing
 * "na" or "blank" are not misread as unsigned.
 */
export function signedLabel(signatureRaw: string): { text: string; signed: boolean } {
  const value = signatureRaw.trim().toLowerCase();
  const unsigned =
    value === "" ||
    /^[\s—–\-_.*]+$/.test(value) ||
    /\b(unsigned|pending|awaiting|not\s+signed|no\s+sign-?off|missing|blank|none|na|n\/a)\b/.test(
      value,
    );
  return { text: unsigned ? "UNSIGNED" : "SIGNED", signed: !unsigned };
}

export function InvoiceCard({
  invoice,
  selected,
  onSelect,
}: {
  invoice: RawInvoice;
  selected: boolean;
  onSelect: () => void;
}) {
  const signature = signedLabel(invoice.signatureRaw);
  const isNew = invoice.priorInvoiceCount === 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Invoice ${invoice.id}, ${invoice.vendor}, ${displayAmount(
        invoice.amountRaw,
      )} dollars, ${signature.signed ? "signed" : "unsigned"}${
        isNew ? ", new vendor" : ""
      }`}
      className={cx(
        "focusable group grid w-full grid-cols-[auto_1fr_auto] items-center gap-x-3 border-b border-line px-3 py-2.5 text-left transition-colors last:border-b-0",
        selected ? "bg-amber-wash/70" : "hover:bg-ink-hover",
      )}
    >
      {/* Selection marker — a 2px bar, not a checkmark or glow. */}
      <span
        aria-hidden
        className={cx(
          "h-8 w-0.5 self-stretch",
          selected ? "bg-amber" : "bg-transparent group-hover:bg-line-strong",
        )}
      />

      <span className="min-w-0">
        <span className="flex items-baseline gap-2">
          <code
            className={cx("num text-xs", selected ? "text-amber-bright" : "text-ash-dim")}
          >
            {invoice.id}
          </code>
          {isNew ? (
            <span className="border border-amber/40 px-1 font-mono text-2xs uppercase tracking-label text-amber">
              new
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block truncate text-sm text-ash">{invoice.vendor}</span>
      </span>

      <span className="text-right">
        <span className="num block text-sm text-ash">{displayAmount(invoice.amountRaw)}</span>
        <span
          className={cx(
            "mt-0.5 block font-mono text-2xs uppercase tracking-label",
            signature.signed ? "text-ash-faint" : "text-verdict-flag",
          )}
        >
          {signature.text}
        </span>
      </span>
    </button>
  );
}
