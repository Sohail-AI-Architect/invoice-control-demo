"use client";

import type { RawInvoice } from "@/lib/types";
import { formatAmount } from "@/lib/format";
import { InvoiceCard } from "./InvoiceCard";

function amountOf(raw: string): string {
  const value = Number.parseFloat(raw.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(value) ? formatAmount(value) : raw;
}

/**
 * The invoice queue.
 *
 * Below `sm` the card list is replaced by a native <select>: at 375px the cards
 * would either wrap awkwardly or need horizontal scrolling, and every field a
 * card shows is repeated in the Maker panel below anyway. A native select also
 * gets platform keyboard and screen-reader behaviour for free.
 */
export function InvoiceList({
  invoices,
  selectedId,
  onSelect,
}: {
  invoices: RawInvoice[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="flex min-w-0 flex-col border border-line bg-ink-raised">
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-medium leading-5 text-ash">Invoice queue</h2>
          <p className="mt-0.5 text-xs leading-4 text-ash-faint">
            Select an invoice to run the check
          </p>
        </div>
        <span className="num shrink-0 border border-line-strong bg-ink-sunken px-2 py-0.5 text-2xs text-ash-dim">
          {invoices.length}
        </span>
      </header>

      {/* Narrow viewports: native dropdown. `min-w-0` on both the wrapper and
          the select stops the longest option from setting the page's minimum
          width — a select sizes to its widest option by default. */}
      <div className="min-w-0 p-3 sm:hidden">
        <label htmlFor="invoice-select" className="label mb-1.5 block">
          Invoice
        </label>
        <select
          id="invoice-select"
          value={selectedId ?? ""}
          onChange={(event) => onSelect(event.target.value)}
          className="focusable num block w-full min-w-0 max-w-full appearance-none truncate border border-line-strong bg-ink-sunken px-2.5 py-2 text-xs text-ash"
        >
          <option value="" disabled>
            Select an invoice…
          </option>
          {invoices.map((invoice) => (
            <option key={invoice.id} value={invoice.id}>
              {invoice.id} · {amountOf(invoice.amountRaw)} · {invoice.vendor}
            </option>
          ))}
        </select>
      </div>

      {/* sm and up: the dense card list. */}
      <div className="hidden flex-col sm:flex">
        {invoices.map((invoice) => (
          <InvoiceCard
            key={invoice.id}
            invoice={invoice}
            selected={invoice.id === selectedId}
            onSelect={() => onSelect(invoice.id)}
          />
        ))}
      </div>
    </section>
  );
}
