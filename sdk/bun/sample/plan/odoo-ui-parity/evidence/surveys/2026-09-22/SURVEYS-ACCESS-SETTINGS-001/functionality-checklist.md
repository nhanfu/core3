# Functionality checklist

| Case | Expected |
| --- | --- |
| Access mode | Persist `public` or `token`; reject unsupported values. |
| Require login | Persist the respondent identity requirement. |
| Limit attempts | Persist enabled state and a positive count. |
| Anonymous public guard | Reject limited attempts without login or invited access. |
| Allow roaming | Persist when compatible; reject the scoring-after-each-page conflict. |
| Permission/state | Require `surveys.write`, actor, non-archived and current row. |
| Restart | Reopen file-backed DuckDB with the same values and row version. |
| Responsive UI | Compare Odoo controls at 1440x900 and 390x844; no Core3 claim while unavailable. |
