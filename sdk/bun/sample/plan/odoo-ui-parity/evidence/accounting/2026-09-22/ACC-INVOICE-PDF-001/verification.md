# Verification

- Focused test: passed, 2 tests and 16 expectations.
- Frontend/CSS production build: passed with `bun run frontend:build`.
- `git diff --check`: passed.
- Global `bun run audit`: blocked by unrelated pre-existing dirty files in
  Inventory/Project: `actions[2].fields[0].empty_option is not allowed` and
  `actions[3].type has unsupported value "lookup"`.
- BrowserSkill: stopped this feature session; authenticated Odoo tab remained
  owned by session `pyhf`, so no live UI claim is made.
