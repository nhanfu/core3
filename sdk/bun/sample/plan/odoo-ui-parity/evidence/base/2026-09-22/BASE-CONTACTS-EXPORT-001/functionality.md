# Functionality assertions

- The default Contacts result exports all 10 active deterministic rows; an
  explicit Archived filter exports the archived result set.
- Search, active/archive status, type, and country filters are forwarded to
  the Contacts datasource before export.
- CSV cells quote values and escape embedded double quotes.
- The export requires `base.contacts.read`; it performs no mutation and needs
  no schema migration.
- Download filename is date-stamped as `contacts-YYYY-MM-DD.csv`.
