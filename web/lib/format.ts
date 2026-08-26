/** Small presentation helpers. No rule logic lives here. */

/** 18400 → "18,400.00". Tabular-friendly, always two decimals. */
export function formatAmount(amount: number | null): string {
  if (amount === null || Number.isNaN(amount)) return "—";
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
