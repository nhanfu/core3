# Spreadsheet engine patch

`odoo-spreadsheet-19.0.50.patch` applies to the pinned
`@odoo/o-spreadsheet@19.0.50` dependency through Bun's `patchedDependencies`.
Both the browser adapter and the server workbook worker import its ESM build.
The patch only changes that build; other upstream entry points are unchanged.

Literal cell evaluation cannot recurse through formula dependencies, so it skips
the evaluator's circular-dependency set. Formula evaluation still uses the
existing cycle detection and cleanup, and literal errors retain the existing
error conversion. This is an optimization candidate, not a claim that the
enterprise performance gate passes.

After changing the engine version, re-evaluate whether this patch is necessary
and regenerate it against that version. Verify installation with
`bun install --frozen-lockfile --ignore-scripts`, then run the spreadsheet browser
suite and backend workbook integration suites. The browser regression covers
cycles, recovery, literals, dependent recalculation and array results.

Run the opt-in million-cell benchmark separately with
`SPREADSHEET_BENCHMARK=true`. Keep the existing thresholds: load and calculation
under 10 seconds, and edit latency p95 under 100 milliseconds. Compare repeated
unprofiled measurements on the same reference machine before claiming a speedup.
CPU profiling is diagnostic and must be reported separately from gate timings.
