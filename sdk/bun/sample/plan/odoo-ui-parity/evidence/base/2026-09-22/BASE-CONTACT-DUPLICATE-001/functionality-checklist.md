# Functionality checklist

- [x] Detail page exposes an Actions menu with Duplicate.
- [x] Client action requires `base.contacts.write` and invokes the API action.
- [x] New contact receives deterministic identity and `(copy)` name.
- [x] Contact fields and category relations are copied.
- [x] Source row remains unchanged.
- [x] Missing, archived, wrong-company, stale-row, and duplicate-ID guards are covered.
- [x] File-backed restart and second-copy numbering are covered.
- [x] Unauthenticated and lower-permission browser transition evidence is not claimed.
- [ ] Fresh authenticated desktop screenshot after duplicate.
- [ ] Fresh authenticated mobile screenshot after duplicate.
