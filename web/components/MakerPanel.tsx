"use client";

import type { CheckResponse, RawInvoice } from "@/lib/types";
import { formatAmount } from "@/lib/format";
import { FieldRow } from "./FieldRow";
import { Panel, PanelSection } from "./Panel";
import { EmptyState, ErrorState, LoadingState } from "./PanelStates";
import { VerdictBadge } from "./VerdictBadge";

const RULE_TEXT: Record<string, string> = {
  "1": "Rule 1 — amount ≥ 10,000 and signature missing",
  "2": "Rule 2 — first-time vendor",
  "3": "Rule 3 — nothing abnormal",
};

export function MakerPanel({
  invoice,
  result,
  loading,
  error,
  onRetry,
}: {
  invoice: RawInvoice | null;
  result: CheckResponse | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <Panel
      letter="A"
      title="Maker"
      subtitle="Applies the invoice rules and issues a verdict"
      accent="amber"
    >
      {!invoice ? (
        <EmptyState message="Select an invoice to run the check." />
      ) : error ? (
        <ErrorState
          message="Couldn't reach the maker. Try again."
          detail={error}
          onRetry={onRetry}
        />
      ) : (
        <>
          <PanelSection label="Invoice fields">
            <div className="flex flex-col">
              <FieldRow label="Invoice" value={invoice.id} />
              <FieldRow label="Vendor" value={invoice.vendor} />
              <FieldRow label="Date" value={invoice.invoiceDate} />
              <FieldRow
                label="Amount"
                value={result ? formatAmount(result.derived.amount) : "—"}
                raw={invoice.amountRaw}
              />
              <FieldRow
                label="Signed"
                value={result ? (result.derived.signaturePresent ? "yes" : "no") : "—"}
                tone={result && !result.derived.signaturePresent ? "warn" : "default"}
                raw={invoice.signatureRaw}
              />
              <FieldRow
                label="Vendor status"
                value={
                  result
                    ? result.derived.vendorIsNew === null
                      ? "unknown"
                      : result.derived.vendorIsNew
                        ? "new"
                        : "known"
                    : "—"
                }
                tone={result?.derived.vendorIsNew ? "warn" : "default"}
                raw={invoice.vendorHistoryNote}
              />
            </div>
          </PanelSection>

          <PanelSection label="Verdict">
            {loading || !result ? (
              <LoadingState rows={2} status="applying rules" />
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <VerdictBadge verdict={result.verdict} />
                  {result.rule !== null ? (
                    <span className="font-mono text-2xs text-ash-faint">
                      {RULE_TEXT[String(result.rule)]}
                    </span>
                  ) : null}
                </div>

                <p className="text-xs leading-5 text-ash-dim">{result.reason}</p>

                {result.dishonest ? (
                  <div className="border-l-2 border-verdict-flag bg-verdict-flagWash px-3 py-2">
                    <p className="font-mono text-2xs uppercase tracking-label text-verdict-flag">
                      Simulated
                    </p>
                    <p className="mt-1 text-xs leading-5 text-ash-dim">
                      This verdict was fabricated by the demo switch — it is not what the
                      rules produce. The fields above are still the true derived values.
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </PanelSection>
        </>
      )}
    </Panel>
  );
}
