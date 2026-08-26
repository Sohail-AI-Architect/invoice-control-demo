"use client";

import { cx } from "@/lib/format";

const DESCRIPTION_ID = "dishonest-toggle-description";

/**
 * The demo switch. Styled as a labelled control with a warning state rather
 * than a playful toggle — it changes what the Maker reports.
 *
 * Accessibility: a real <input type="checkbox"> drives it, so it is reachable
 * and operable by keyboard with no custom key handling. The explanatory
 * paragraph is wired up via aria-describedby, and the visual tick is drawn with
 * a sibling element marked aria-hidden.
 */
export function DishonestToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div
      className={cx(
        "border transition-colors",
        checked
          ? "border-verdict-flag/55 bg-verdict-flagWash"
          : "border-line bg-ink-raised hover:border-line-strong",
      )}
    >
      <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5">
        <span className="relative mt-px flex h-4 w-4 shrink-0 items-center justify-center">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => onChange(event.target.checked)}
            aria-describedby={DESCRIPTION_ID}
            className={cx(
              "focusable peer h-4 w-4 cursor-pointer appearance-none border bg-ink-sunken",
              checked ? "border-verdict-flag" : "border-line-strong",
            )}
          />
          {checked ? (
            <span
              aria-hidden
              className="pointer-events-none absolute h-2 w-2 bg-verdict-flag"
            />
          ) : null}
        </span>

        <span className="min-w-0">
          <span
            className={cx(
              "block font-mono text-2xs uppercase tracking-label",
              checked ? "text-verdict-flag" : "text-ash-dim",
            )}
          >
            Simulate dishonest verdict
          </span>
          <span id={DESCRIPTION_ID} className="mt-1 block text-xs leading-5 text-ash-faint">
            Forces the Maker to report APPROVED even when the rules say otherwise. The
            Checker re-derives its verdict from the raw invoice data, so it should catch
            the false approval.
          </span>
        </span>
      </label>

      {checked ? (
        <p
          role="status"
          className="border-t border-verdict-flag/30 px-3 py-2 text-2xs leading-4 text-verdict-flag"
        >
          Active — the Maker is now reporting APPROVED regardless of the rules.
        </p>
      ) : null}
    </div>
  );
}
