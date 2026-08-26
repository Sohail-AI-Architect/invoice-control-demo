import type { Verdict } from "@/lib/types";
import { cx } from "@/lib/format";

/** Verdict labels use the UI wording; the API keeps SKILL.md's spellings. */
export const VERDICT_LABEL: Record<Verdict, string> = {
  APPROVE: "APPROVED",
  FLAG: "FLAG",
  "REVIEW NEEDED": "REVIEW NEEDED",
};

const VERDICT_STYLE: Record<Verdict, string> = {
  APPROVE: "border-verdict-approve/55 bg-verdict-approveWash text-verdict-approve",
  FLAG: "border-verdict-flag/55 bg-verdict-flagWash text-verdict-flag",
  "REVIEW NEEDED": "border-verdict-review/55 bg-verdict-reviewWash text-verdict-review",
};

const BASE =
  "inline-flex items-center gap-2 border px-2.5 py-1 font-mono text-2xs uppercase tracking-label";

export function VerdictBadge({
  verdict,
  size = "md",
}: {
  verdict: Verdict;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cx(
        BASE,
        VERDICT_STYLE[verdict],
        size === "sm" && "px-2 py-0.5",
      )}
    >
      <Dot className="opacity-80" />
      {VERDICT_LABEL[verdict]}
    </span>
  );
}

export function OutcomeBadge({
  outcome,
}: {
  outcome: "MATCH" | "MISMATCH" | "NO_DECISION_SUPPLIED";
}) {
  const style =
    outcome === "MATCH"
      ? "border-verdict-approve/55 bg-verdict-approveWash text-verdict-approve"
      : outcome === "MISMATCH"
        ? "border-verdict-flag/55 bg-verdict-flagWash text-verdict-flag"
        : "border-line-strong bg-ink-sunken text-ash-dim";

  const label = outcome === "NO_DECISION_SUPPLIED" ? "NO DECISION" : outcome;

  return (
    <span className={cx(BASE, style)}>
      <Dot className="opacity-80" />
      {label}
    </span>
  );
}

/** 4px square, not a circle — keeps the flat, drafting-table feel. */
function Dot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cx("h-1.5 w-1.5 bg-current", className)}
    />
  );
}
