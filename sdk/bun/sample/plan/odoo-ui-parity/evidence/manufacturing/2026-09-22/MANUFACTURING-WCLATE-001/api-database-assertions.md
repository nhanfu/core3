# API and database assertions

Focused assertions passed:

- page YAML is presentation-only and API YAML has matching page ID;
- selected-center default query returns only durable late non-terminal rows;
- `late=false`, empty, and transport-error cases are explicit;
- migration `0.0.23` replays without duplicate rows/indexes;
- file-backed reopen returns the same late rows;
- no fixture-only table or rows are introduced.

The focused suite passed 4 tests / 29 assertions.
