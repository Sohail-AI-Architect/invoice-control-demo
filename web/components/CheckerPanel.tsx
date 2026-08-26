"use client";

import type { CheckResponse, Verdict, VerifyResponse } from "@/lib/types";
import { formatAmount } from "@/lib/format";
import { FieldRow } from "./FieldRow";
import { Panel, PanelSection } from "./Panel";
import { EmptyState, ErrorState, LoadingState } from "./PanelStates";
import { OutcomeBadge, VERDICT_LABEL, VerdictBadge } from "./VerdictBadge";

export function CheckerPanel({
  hasInvoice,
  result,
  makerResult,
  loading,
  error,
  onRetry,
}: {
  hasInvoice: boolean;
  result: VerifyResponse | null;
  makerResult: CheckResponse | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <Panel
      letter="B"
      title="Checker"
      subtitle="Re-derives the verdict independently and compares"
    >
      {!hasInvoice ? (
        <EmptyState message="The independent check runs once an invoice is selected." />
      ) : error ? (
        <ErrorState
          message="Couldn't reach the checker. Try again."
          detail={error}
          onRetry={onRetry}
        />
      ) : (
        <>
          <PanelSection label="Independently re-derived fields">
            {loading || !result ? (
              <LoadingState rows={3} status="re-deriving" />
            ) : (
              <div className="flex flex-col">
                <FieldRow label="Amount" value={formatAmount(result.derived.amount)} />
                <FieldRow
                  label="Signature"
                  value={result.derived.signaturePresent ? "present" : "missing"}
                  tone={result.derived.signaturePresent ? "default" : "warn"}
                />
                <FieldRow
                  label="Vendor is new"
                  value={
                    result.derived.vendorIsNew === null
                      ? "unknown"
                      : result.derived.vendorIsNew
                        ? "yes"
                        : "no"
                  }
                  tone={result.derived.vendorIsNew ? "warn" : "default"}
                />
              </div>
            )}
            <p className="mt-2 text-2xs leading-4 text-ash-faint">
              Re-extracted from the raw invoice data. The Maker&apos;s verdict is not read
              until after this step.
            </p>
          </PanelSection>

          <PanelSection label="Audit result">
            {loading || !result ? (
              <LoadingState rows={2} status="comparing" />
            ) : (
              <div className="flex min-w-0 flex-col gap-3">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  <OutcomeBadge outcome={result.outcome} />
                  <span className="font-mono text-2xs text-ash-faint">
                    checker&apos;s own verdict
                  </span>
                  <VerdictBadge verdict={result.derivedVerdict} size="sm" />
                </div>

                {/* The subagent's literal output line. */}
                <pre className="overflow-x-auto whitespace-pre-wrap break-words border border-line bg-ink-sunken px-3 py-2 font-mono text-2xs leading-5 text-ash-dim">
                  {result.line}
                </pre>

                {result.outcome === "MISMATCH" && makerResult ? (
                  <MismatchWarning
                    makerVerdict={makerResult.verdict}
                    checkerVerdict={result.derivedVerdict}
                  />
                ) : null}

                {result.overriddenRuleNote ? (
                  <div className="border-l-2 border-line-strong px-3 py-1.5">
                    <p className="label">Overridden rule</p>
                    <p className="mt-0.5 font-mono text-2xs leading-4 text-ash-faint">
                      {result.overriddenRuleNote}
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

function MismatchWarning({
  makerVerdict,
  checkerVerdict,
}: {
  makerVerdict: Verdict;
  checkerVerdict: Verdict;
}) {
  return (
    <div role="alert" className="border border-verdict-flag/55 bg-verdict-flagWash px-3 py-3">
      <p className="font-mono text-2xs uppercase tracking-label text-verdict-flag">
        Do not pay — human review required
      </p>
      <p className="mt-2 text-xs leading-5 text-ash">
        This invoice should not be paid without human review. The maker returned{" "}
        <span className="num text-verdict-flag">{VERDICT_LABEL[makerVerdict]}</span>, while
        the checker independently derived{" "}
        <span className="num text-verdict-flag">{VERDICT_LABEL[checkerVerdict]}</span>.
      </p>
      <p className="mt-2 text-2xs leading-4 text-ash-faint">
        The two decisions disagree, so the verdict is untrusted. Route to a human approver
        before any payment is released.
      </p>
    </div>
  );
}
