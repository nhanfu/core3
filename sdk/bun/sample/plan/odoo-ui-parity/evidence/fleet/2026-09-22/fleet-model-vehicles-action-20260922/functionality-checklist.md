# Functionality checklist

- [x] Stable feature ID recorded: `FLEET-MODEL-VEHICLES-001`.
- [x] Model detail and Vehicles API/page contracts remain separate.
- [x] Stat navigation passes the stable model ID, not a display-name guess.
- [x] Relation schema and deterministic data migration are idempotent.
- [x] Selected model returns only its vehicle rows.
- [x] Unknown model returns an empty result.
- [x] Wrong-company query returns no rows.
- [x] Explicit empty fixture returns no rows.
- [x] Transport fixture returns the declared 503 error.
- [x] Read permission remains `fleet.read`.
- [ ] Authenticated Odoo desktop comparison.
- [ ] Authenticated Odoo mobile comparison.
- [ ] Authenticated Core3 desktop/mobile action click proof.
