# Approval Flow Checklist

## Visible controls

- Flow summary shows code, description, and active state.
- Ordered step grid shows sequence, approver role, minimum amount, and status.
- `+ Thêm bước` opens a server-authorized step editor.
- Reorder, edit, and delete actions are visible only with `system.write`.

## Interaction checks

- Create a step with a role, minimum amount, and active status.
- Move a step up/down and verify neighboring sequence values swap.
- Reject missing step name/approver role and negative minimum amounts.
- Edit and delete a step; confirm the grid refreshes and each mutation is audited.
- Confirm a read-only user cannot invoke step mutations through the API.

## Responsive check

- Desktop capture: `local-detail-desktop.png` at 1440 x 1000.
- Tablet capture: `local-detail-tablet.png` at 1024 x 768.
