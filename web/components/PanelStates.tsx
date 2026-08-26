"use client";

/**
 * The three non-result states a panel can be in: empty (nothing selected),
 * loading (request in flight), and error (request failed).
 *
 * All three keep the panel's height and border intact so the layout does not
 * jump between states.
 */

/** Empty state — shown before any invoice is picked. */
export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-10 text-center">
      <DocumentIcon />
      <p className="max-w-[24ch] text-xs leading-5 text-ash-faint">{message}</p>
    </div>
  );
}

/** Loading state — sliding hairline plus skeleton rows. */
export function LoadingState({
  rows = 4,
  status,
}: {
  rows?: number;
  status: string;
}) {
  return (
    <div className="flex flex-col gap-4" aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-3">
        <span className="progress-line" aria-hidden />
        <span className="label shrink-0">{status}</span>
      </div>

      <div className="flex flex-col gap-2" aria-hidden>
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center justify-between gap-6">
            <div
              className="skeleton h-2.5"
              style={{ width: `${28 + ((index * 13) % 22)}%` }}
            />
            <div
              className="skeleton h-2.5"
              style={{ width: `${18 + ((index * 7) % 16)}%` }}
            />
          </div>
        ))}
      </div>

      <span className="sr-only">{status}</span>
    </div>
  );
}

/**
 * Inline error state. Never shows a stack trace — `detail` carries the
 * technical string for the small print, the headline stays human.
 */
export function ErrorState({
  message,
  detail,
  onRetry,
}: {
  message: string;
  detail?: string | null;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-1 flex-col items-start gap-3 border border-verdict-flag/55 bg-verdict-flagWash px-3 py-3"
    >
      <div className="flex items-start gap-2.5">
        <WarningIcon />
        <div className="min-w-0">
          <p className="font-mono text-2xs uppercase tracking-label text-verdict-flag">
            Request failed
          </p>
          <p className="mt-1.5 text-xs leading-5 text-ash">{message}</p>
          {detail ? (
            <p className="mt-1 break-words font-mono text-2xs leading-4 text-ash-faint">
              {detail}
            </p>
          ) : null}
        </div>
      </div>

      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="focusable border border-line-strong bg-ink-sunken px-2.5 py-1 font-mono text-2xs uppercase tracking-label text-ash transition-colors hover:border-amber/60 hover:text-amber-bright"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

/* ---- icons: 1px stroke line art, sized to the type, never decorative ---- */

function DocumentIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      className="text-line-strong"
      aria-hidden
    >
      <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z" />
      <path d="M14 3v4h4" />
      <path d="M9 12h6M9 15.5h6M9 8.5h2" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="mt-0.5 shrink-0 text-verdict-flag"
      aria-hidden
    >
      <path d="M12 4.5 21 20H3z" />
      <path d="M12 10v4.5M12 17.2v.3" />
    </svg>
  );
}
