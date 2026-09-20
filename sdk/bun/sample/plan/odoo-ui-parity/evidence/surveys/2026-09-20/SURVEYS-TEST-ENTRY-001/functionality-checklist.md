# Functionality checklist

- [x] Page/API YAML contracts remain separate and join by `page.id`.
- [x] Authenticated launch requires `surveys.write`.
- [x] Survey token, non-archived state, question presence, and deterministic
  test-entry guards are explicit.
- [x] A stable per-survey idempotency key prevents key reassignment.
- [x] Test-entry state and answer reset persist through DuckDB restart.
- [x] Repeated launch does not create a second test response row.
- [x] Core3 authenticated desktop/mobile launch evidence captured.
- [x] Odoo authenticated desktop/mobile comparison captured.
