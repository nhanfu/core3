# Quote lifecycle controls

## Workflow inventory

- Draft: edit, send, cancel, or delete.
- Sent: accept, return to Draft for revision, or cancel.
- Accepted and Cancelled: terminal.
- Status is omitted from create/edit forms and rejected by generic
  `/api/patch` calls.

The matching reference default, editor, and sent-state captures still need to
be collected before final visual-parity signoff.

## Local interaction checklist

- [x] Draft, Sent, Accepted, and Cancelled rows expose only state-valid actions.
- [x] Send resolves Draft to Sent without accepting a client target state.
- [x] Accept resolves Sent to Accepted.
- [x] Revise resolves Sent to Draft.
- [x] Cancel resolves Draft or Sent to Cancelled.
- [x] Invalid repeated transitions return `409`.
- [x] Accepted records cannot be generically edited or deleted.
- [x] Transition and generic mutation activity records retain actor/resource IDs.
- [x] Currency values use grouped display formatting.
- [x] A pointer click confirms Send and refreshes the row to Sent in place.
- [x] 1440 x 1000 and 1024 x 768 have no document overflow.

## Local evidence

- `local-desktop.png`: 1440 x 1000 after sending the QA quote.
- `local-tablet.png`: 1024 x 768 after sending the QA quote.
