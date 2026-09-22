# Verification

- Local Odoo source/action inspection completed before editing.
- Core3 page/API separation is preserved through `page.id: employees`.
- Focused persistence and migration tests pass: 3 tests / 18 assertions.
- `git diff --check` and the frontend build are required before commit.
- Browser verification is blocked by tab ownership in BrowserSkill instance
  `245ea108`; no desktop/mobile visual-parity claim is made.
- This is one bounded Employees analysis gap only; the Employees module is not
  declared complete.
