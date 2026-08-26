import { cx } from "@/lib/format";

/**
 * Panel shell: letter chip, title, and a plain-language subtitle.
 *
 * Deliberately shows no file paths — the mapping to `.claude/skills/…` and
 * `.claude/agents/…` is documented in the README, not on a live product screen.
 * Flat: 1px border, no shadow, no radius beyond 2px.
 */
export function Panel({
  letter,
  title,
  subtitle,
  accent = "neutral",
  children,
}: {
  letter: string;
  title: string;
  subtitle: string;
  accent?: "neutral" | "amber";
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col border border-line bg-ink-raised">
      <header className="flex items-start gap-3 border-b border-line px-4 py-3">
        <span
          className={cx(
            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border font-mono text-2xs",
            accent === "amber"
              ? "border-amber/50 bg-amber-wash text-amber-bright"
              : "border-line-strong bg-ink-sunken text-ash-dim",
          )}
          aria-hidden
        >
          {letter}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-medium leading-5 text-ash">{title}</h2>
          <p className="mt-0.5 text-xs leading-4 text-ash-faint">{subtitle}</p>
        </div>
      </header>
      <div className="flex min-w-0 flex-1 flex-col gap-4 p-4">{children}</div>
    </section>
  );
}

/** Section label inside a panel, with a hairline rule running to the edge. */
export function PanelSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <span className="label shrink-0">{label}</span>
        <span aria-hidden className="h-px flex-1 bg-line" />
      </div>
      {children}
    </div>
  );
}
