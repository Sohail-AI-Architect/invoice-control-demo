"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AppHeader } from "@/components/AppHeader";
import { CheckerPanel } from "@/components/CheckerPanel";
import { DishonestToggle } from "@/components/DishonestToggle";
import { InvoiceList } from "@/components/InvoiceList";
import { MakerPanel } from "@/components/MakerPanel";
import { VERDICT_LABEL } from "@/components/VerdictBadge";
import { SAMPLE_INVOICES } from "@/lib/invoices";
import type { CheckResponse, VerifyResponse } from "@/lib/types";

/**
 * Minimum time each stage stays in its loading state.
 *
 * Both routes answer in single-digit milliseconds locally, which would make the
 * skeletons flash imperceptibly and the two-stage maker → checker pipeline
 * invisible. Holding each stage briefly makes the sequence legible without
 * meaningfully slowing anything down. Set to 0 to disable.
 */
const MIN_STAGE_MS = 260;

async function atLeast<T>(work: Promise<T>, ms: number): Promise<T> {
  const [result] = await Promise.all([
    work,
    new Promise((resolve) => setTimeout(resolve, ms)),
  ]);
  return result;
}

/** Turns a failed response into a short technical detail line, never a stack. */
async function describeFailure(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    if (body?.error) return `HTTP ${response.status} — ${body.error}`;
  } catch {
    /* body was not JSON; fall through to the status line */
  }
  return `HTTP ${response.status} ${response.statusText}`.trim();
}

export default function Page() {
  // Starts empty so the panels open in their empty state rather than
  // auto-running a check the visitor did not ask for.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dishonest, setDishonest] = useState(false);

  const [maker, setMaker] = useState<CheckResponse | null>(null);
  const [checker, setChecker] = useState<VerifyResponse | null>(null);
  const [makerLoading, setMakerLoading] = useState(false);
  const [checkerLoading, setCheckerLoading] = useState(false);
  const [makerError, setMakerError] = useState<string | null>(null);
  const [checkerError, setCheckerError] = useState<string | null>(null);

  // Guards against a slower earlier request overwriting a newer one when you
  // click through the queue quickly.
  const runRef = useRef(0);

  const selected = SAMPLE_INVOICES.find((invoice) => invoice.id === selectedId) ?? null;

  const run = useCallback(async (invoiceId: string | null, simulateDishonest: boolean) => {
    const invoice = SAMPLE_INVOICES.find((item) => item.id === invoiceId);
    const runId = ++runRef.current;

    setMaker(null);
    setChecker(null);
    setMakerError(null);
    setCheckerError(null);

    if (!invoice) {
      setMakerLoading(false);
      setCheckerLoading(false);
      return;
    }

    setMakerLoading(true);
    setCheckerLoading(true);

    // ---- Stage 1 — the Maker decides -------------------------------------
    let makerResult: CheckResponse;
    try {
      const response = await atLeast(
        fetch("/api/check-invoice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoice, simulateDishonest }),
        }),
        MIN_STAGE_MS,
      );
      if (!response.ok) throw new Error(await describeFailure(response));
      makerResult = (await response.json()) as CheckResponse;
    } catch (caught) {
      if (runRef.current !== runId) return;
      setMakerError(caught instanceof Error ? caught.message : "Unexpected error");
      setCheckerError("The maker step failed, so there was no decision to verify.");
      setMakerLoading(false);
      setCheckerLoading(false);
      return;
    }

    if (runRef.current !== runId) return;
    setMaker(makerResult);
    setMakerLoading(false);

    // ---- Stage 2 — the Checker audits ------------------------------------
    // It receives the raw invoice and the verdict under audit, and nothing the
    // Maker derived along the way.
    try {
      const response = await atLeast(
        fetch("/api/verify-invoice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoice,
            givenDecision: { verdict: makerResult.verdict, reason: makerResult.reason },
          }),
        }),
        MIN_STAGE_MS,
      );
      if (!response.ok) throw new Error(await describeFailure(response));
      const checkerResult = (await response.json()) as VerifyResponse;
      if (runRef.current !== runId) return;
      setChecker(checkerResult);
    } catch (caught) {
      if (runRef.current !== runId) return;
      setCheckerError(caught instanceof Error ? caught.message : "Unexpected error");
    } finally {
      if (runRef.current === runId) setCheckerLoading(false);
    }
  }, []);

  useEffect(() => {
    void run(selectedId, dishonest);
  }, [run, selectedId, dishonest]);

  const retry = useCallback(() => {
    void run(selectedId, dishonest);
  }, [run, selectedId, dishonest]);

  const busy = makerLoading || checkerLoading;
  const mismatch = checker?.outcome === "MISMATCH";

  return (
    <div className="min-h-screen">
      <AppHeader />

      <main className="mx-auto max-w-[1400px] px-3 py-4 sm:px-6 sm:py-6">
        {/* Status strip — the one-line summary an ops reviewer reads first. */}
        <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 border border-line bg-ink-raised px-3 py-2.5 sm:mb-5 sm:px-4">
          <StatusItem label="selected" value={selected ? selected.id : "none"} />
          <StatusItem
            label="maker"
            value={
              maker
                ? VERDICT_LABEL[maker.verdict]
                : makerError
                  ? "failed"
                  : busy
                    ? "…"
                    : "—"
            }
            tone={makerError ? "warn" : "default"}
          />
          <StatusItem
            label="checker"
            value={
              checker
                ? checker.outcome.replace(/_/g, " ")
                : checkerError
                  ? "failed"
                  : busy
                    ? "…"
                    : "—"
            }
            tone={mismatch || checkerError ? "warn" : checker ? "good" : "default"}
            live
          />
          <div className="ml-auto flex items-center gap-2">
            <span
              aria-hidden
              className={`h-1.5 w-1.5 ${busy ? "bg-amber" : "bg-line-strong"}`}
            />
            <span className="label">{busy ? "running" : "idle"}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(260px,320px)_1fr] lg:gap-5">
          {/* Left rail — queue + demo switch.
              min-w-0 is required: grid items default to min-width:auto, which
              would let the <select>'s long option text set an un-shrinkable
              min-content floor and push the page wider than a 375px viewport. */}
          <div className="flex min-w-0 flex-col gap-4">
            <InvoiceList
              invoices={SAMPLE_INVOICES}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
            <DishonestToggle checked={dishonest} onChange={setDishonest} />
          </div>

          {/* Right — the two panels */}
          <div className="grid min-w-0 grid-cols-1 items-stretch gap-4 xl:grid-cols-2 xl:gap-5">
            <MakerPanel
              invoice={selected}
              result={maker}
              loading={makerLoading}
              error={makerError}
              onRetry={retry}
            />
            <CheckerPanel
              hasInvoice={Boolean(selected)}
              result={checker}
              makerResult={maker}
              loading={checkerLoading}
              error={checkerError}
              onRetry={retry}
            />
          </div>
        </div>

        <footer className="mt-5 border-t border-line pt-3">
          <p className="text-2xs leading-4 text-ash-faint">
            Maker and checker run as independent, non-shared logic.
          </p>
        </footer>
      </main>
    </div>
  );
}

function StatusItem({
  label,
  value,
  tone = "default",
  live = false,
}: {
  label: string;
  value: string;
  tone?: "default" | "warn" | "good";
  live?: boolean;
}) {
  const toneClass =
    tone === "warn"
      ? "text-verdict-flag"
      : tone === "good"
        ? "text-verdict-approve"
        : "text-ash";

  return (
    <div className="flex items-baseline gap-2">
      <span className="label">{label}</span>
      <span className={`num text-xs ${toneClass}`} {...(live ? { role: "status" } : {})}>
        {value}
      </span>
    </div>
  );
}
