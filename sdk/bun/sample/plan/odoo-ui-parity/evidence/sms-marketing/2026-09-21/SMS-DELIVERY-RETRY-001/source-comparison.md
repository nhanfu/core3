# Source comparison

| Odoo source contract | Core3 implementation | Result |
| --- | --- | --- |
| `action_retry_failed_sms` requeues a sent mailing with failed SMS | `retry_failed_sms_campaign` guarded YAML mutation updates campaign and attempt rows atomically | bounded parity; audit rows are retained for durable history |
| `mailing_trace_view_tree_sms` | `pages/delivery-traces.yaml` list view | mapped |
| `mailing_trace_view_form_sms`, readonly | `pages/delivery-trace-detail.yaml` `OdooFormView`, `editable: false` | mapped |
| `mailing_trace_action` reached from a mailing | `View Traces` action from the SMS campaign detail to `/sms-delivery-traces` | mapped route alias |
| Odoo provider delivery callback `/sms/status` | not implemented in this feature | explicitly deferred |
