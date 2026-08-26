import { cx } from "@/lib/format";

/**
 * Label / value row. Values are monospace and right-aligned so that amounts
 * and flags stack into readable columns across both panels.
 */
export function FieldRow({
  label,
  value,
  tone = "default",
  raw,
}: {
  label: string;
  value: string;
  tone?: "default" | "warn" | "good" | "muted";
  /** Optional raw source string, shown small underneath the value. */
  raw?: string;
}) {
  const toneClass =
    tone === "warn"
      ? "text-verdict-flag"
      : tone === "good"
        ? "text-verdict-approve"
        : tone === "muted"
          ? "text-ash-faint"
          : "text-ash";

  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line/60 py-1.5 last:border-b-0">
      <span className="label pt-0.5">{label}</span>
      <span className="min-w-0 text-right">
        <span className={cx("num text-xs", toneClass)}>{value}</span>
        {raw ? (
          <span className="block font-mono text-2xs text-ash-faint">{raw}</span>
        ) : null}
      </span>
    </div>
  );
}
