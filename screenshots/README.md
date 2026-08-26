# Screenshots

These images are **generated**, not captured by hand. Don't edit them manually — regenerate them.

```bash
cd web
npm run dev            # in one terminal
npm run screenshots    # in another
```

`web/scripts/capture-screenshots.mjs` drives a real headless Chrome over the DevTools
Protocol: it selects the invoice, flips the demo switch, waits for both API stages to
settle, reads the rendered status strip back to confirm it captured the intended state,
and writes all five files here.

If a run prints `OVERFLOW+Npx` next to a shot, the layout broke at that width — fix the
layout rather than the screenshot.

## What each file shows

| File | Width | State | Why it's in the README |
| --- | --- | --- | --- |
| `01-overview.png` | 1440px | `NL-4471` selected, switch off | The normal case: $18,400 unsigned → rule 1 → `FLAG`, and the Checker independently agrees (`MATCH`). Establishes what agreement looks like. |
| `02-mismatch.png` | 1440px | `NL-4471`, switch **on** | The point of the project. Maker claims `APPROVED`, Checker re-derives `FLAG`, reports `MISMATCH`, and blocks payment. |
| `03-override.png` | 1440px | `HF-2287`, switch off | Rule precedence: exactly $10,000 from a new vendor. Rule 1 outranks rule 2, and the Checker records the suppressed rule as an audit note. |
| `04-mobile.png` | 375px | `NL-4471`, switch off | Responsive proof — single column, invoice queue as a native dropdown. |
| `05-empty.png` | 1440px | Nothing selected | The empty state, before any check has run. |

`02-mismatch.png` is the one to lead with anywhere you only get one image.

## If you'd rather shoot them yourself

Use a 1440×900 viewport for the desktop shots and 375×812 for mobile, keep the browser in
dark mode, and hide any extension chrome or bookmark bars. The generated versions already
match the README table, so this is only worth doing if you want a device frame or an
annotated version for a case study.
