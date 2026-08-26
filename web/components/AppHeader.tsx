/**
 * Product header. `process.env.NODE_ENV` is statically inlined at build time by
 * Next, so the environment chip reports the real build environment rather than
 * a hardcoded "demo" label.
 */
const ENV_LABEL = process.env.NODE_ENV === "production" ? "production" : "development";

export function AppHeader() {
  return (
    <header className="border-b border-line bg-ink-raised">
      <div className="mx-auto flex max-w-[1400px] items-start gap-3 px-4 py-3 sm:items-center sm:px-6">
        <span
          aria-hidden
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border border-amber/50 bg-amber-wash font-mono text-2xs text-amber-bright sm:mt-0"
        >
          IC
        </span>

        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-medium leading-5 tracking-tight text-ash">
            Invoice Control
          </h1>
          <p className="mt-0.5 text-xs leading-4 text-ash-faint">
            Maker/checker separation of duties, demonstrated end to end
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="label hidden sm:inline">env</span>
          <code className="num border border-line-strong bg-ink-sunken px-2 py-0.5 text-2xs text-ash-dim">
            {ENV_LABEL}
          </code>
        </div>
      </div>
    </header>
  );
}
