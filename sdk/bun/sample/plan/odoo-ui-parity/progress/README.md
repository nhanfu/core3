# Per-module parity progress

This directory prevents module agents from conflicting on the shared
`../progress.md` aggregate.

## Ownership rules

- Each module has one file: `<module>.md`.
- The owning module agent may update only its own file while pursuing the
  module goal through parity sign-off or a confirmed source blocker.
- The shared tester reads these files, verifies the claims, and consolidates
  the authoritative state into `../progress.md`.
- Agents must not edit another module's file, `../progress.md`, or the shared
  `../module-qa.md` ledger unless the tester explicitly assigns that action.
- Use frequent commits for source/tests/docs, but keep progress updates local
  to the module file to avoid merge conflicts.

## Required module file format

Copy `_template.md` to `<module>.md` when a module agent starts. Keep the
module's current state and bounded-slice history there. The tester may append
verification and sign-off results, then mirror the final state into the shared
aggregate.
