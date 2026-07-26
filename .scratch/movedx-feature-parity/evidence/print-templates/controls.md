# Print Template Checklist

## Visible controls

- Template summary shows code, description, status, and configured template key.
- Ordered block grid shows text, token, table, and spacer blocks.
- Token blocks use a declarative picker for supported order tokens.
- Add, edit, delete, and move controls are permission-gated by `system.write`.
- Column chooser is available on the block grid.

## Interaction checks

- Add a text block and reject an empty text body.
- Add a token block and choose `order.order_number` from the token picker.
- Reject a token block without a token key.
- Move blocks up/down and confirm sequence ordering changes.
- Edit and delete a block; verify refresh and audit activity.

## Responsive check

- Desktop capture: `local-detail-desktop.png` at 1440 x 1000.
- Tablet capture: `local-detail-tablet.png` at 1024 x 768.
