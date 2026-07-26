# Schedule parity controls

## Reference inventory

- Route: `#/schedule`
- Permission gate: dispatch read access
- State: in-development placeholder inside the standard application shell
- Primary actions: none
- Filters, grids, editors, and exports: none

The reference screenshots still need to be recaptured from the read-only tenant
before this route can receive final visual-parity signoff.

## Local interaction checklist

- [x] Authenticated navigation selects **Lịch điều** in the Operations group.
- [x] The route title is **Lịch điều**.
- [x] The route renders the declarative `ComingSoon` component.
- [x] No trip grid, filters, editor actions, or exports are exposed.
- [x] The in-development heading and supporting copy render at 1440 x 1000.
- [x] The in-development heading and supporting copy render at 1024 x 768.
- [x] Neither viewport has document or outlet horizontal overflow.
- [x] The calendar artwork is decorative and hidden from assistive technology.
- [x] Reduced-motion users do not receive the floating artwork animation.
- [x] Browser console contains no errors after authenticated navigation.

## Local evidence

- `local-desktop.png`: 1440 x 1000
- `local-tablet.png`: 1024 x 768
