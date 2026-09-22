# Source comparison

| Odoo behavior | Core3 change |
| --- | --- |
| `action_view_traces_failed` opens Mailing Traces for the current mailing | Add `view_failed_email_mailing` to the existing mailing-detail API and stat surface. |
| `filter_failed` selects `trace_status = 'error'` | Pass `trace_status=error` and add the optional `mass_mailing_id` datasource predicate. |
| Trace action is read-only | Preserve the existing technical `email_marketing.settings` permission and error states. |
| Installed visual reference | Record Discuss-only `core3_reference` limitation; no visual claim. |
