# EMP-EMPLOYEE-AVATAR-001 verification

## Focused integration

`bun test test/employees_avatar.integration.test.ts`

- **4 passed, 0 failed, 25 assertions**.
- Source mapping asserts Odoo's `hr.employee.image_1920` image widget and the
  paired Core3 page/API contracts.
- Upload and remove mutations persist the avatar projection, enforce actor,
  company, active-state, MIME/size, and optimistic row-version guards, and
  preserve metadata through file-backed restart.

## Browser/runtime

- Authenticated Core3 `admin@tms.local` captured the Employee detail route at
  1440x900 and 390x844. Both captures had zero request/page failures and no
  horizontal overflow. The session company was `Core3 Demo Company`, while
  deterministic Employees fixtures are `Core3 Vietnam`; therefore the guarded
  detail datasource returned no populated employee avatar/action in this
  session. This is a fixture-company blocker, not a visual sign-off.
- Odoo desktop/mobile login captures reached the live login page, but the
  available local credential was rejected with `Wrong login/password`, so an
  authenticated Employee avatar comparison is blocked. No Odoo parity claim
  is made.

## Artifacts

| Capture | Path | SHA-256 |
| --- | --- | --- |
| Core3 desktop | `core3-desktop.png` | `9de661aa75721f63046ecd82127211b1a4667c1b41153f5a5a849439c09fc130` |
| Core3 mobile | `core3-mobile.png` | `9c49e0763ef73774680585657f5bfcaf14049b29df08a88807a5fb57b774e738` |
| Odoo desktop blocker | `odoo-desktop.png` | `5f63dd1effd94dbba0dd993e329394bb18ef90bedf876b71313f67a3d79e49d8` |
| Odoo mobile blocker | `odoo-mobile.png` | `e7b4dbb8bf140f61c89a9d8875be5b074b6685bb0c1d31130387226eb8eb2b0b` |

No aggregate Employees sign-off is claimed.
