# Expenses batch 7 - incoming email gateway

Status: implemented; conditional browser evidence
Date: 2026-09-21
Feature ID: EXPENSE-FUNC-010

## Source-backed scope

Odoo 19 hr_expense exposes Incoming Emails in
/home/nhanjs/projects/odoo/addons/hr_expense/views/res_config_settings_views.xml.
The setting stores hr_expense_use_mailgateway, an expense alias prefix, and an
alias domain. hr_expense/models/res_config_settings.py persists the alias
configuration, while hr_expense/models/hr_expense.py implements message_new.
The source mail-import tests in hr_expense/tests/test_expenses_mail_import.py
verify employee resolution, subject amount/category parsing, and draft
creation. Receipts arrive as mail attachments and remain editable until
submission.

Before this batch Core3 exposed only the incoming_email checkbox. It had no
durable alias/domain configuration, sender-to-employee identity mapping,
inbound message idempotency record, or mail-created expense path.

## Core3 contract

- pages/settings.yaml remains presentation-only. It now exposes Odoo-shaped
  Alias and Alias Domain fields beside Incoming Emails.
- api/settings.yaml remains the backend boundary joined by page.id:
  expenses-settings. The settings update action validates alias and domain
  values without requiring a row-version column on the singleton.
- receive_expense_email is a permissioned expenses.write server-form action.
  It accepts a stable message ID, sender/recipient, subject/body, explicit
  seeded expense date, and optional receipt metadata.
- The action requires the gateway to be enabled, recipient to match the
  configured alias, company scope to match, and replay content to be unchanged.
  It resolves seeded sender identities, parses a leading category reference/name
  and amount from the subject, creates a Draft expense, persists the inbound
  message/receipt/activity, and recalculates the owning sheet total.
- Replay is idempotent by message ID; a changed replay is rejected. The
  migration is idempotent and uses a fixed evidence timestamp rather than
  CURRENT_TIMESTAMP.

## Verification

- Focused: bun test test/expenses_email_gateway.integration.test.ts
  --timeout 20000 - 3 passed, 19 assertions.
- Full Expenses corpus: 42 tests / 248 assertions across 12 files passed after
  updating the migration replay expectation for the new version.
- Expenses CSS: bun run css:build:expenses - passed.
- git diff --check - passed.
- bun run audit passed with 772 pages, 781 routes, and 1,582 datasources. No
  CRM or other module files are part of this candidate.
- Current Core3 desktop/mobile capture refresh was attempted with an isolated
  memory runtime at ports 4029/4030. The backend eventually bound after delayed
  startup, but the shared browser profile had no Core3 authentication and
  `/api/pages/dashboard` returned 401; the session was stopped. No Core3 browser
  parity claim is made for this batch.
- Odoo live browser evidence was refreshed on shared browser instance
  245ea108: authenticated /odoo opened the Expenses app and My Expenses menu.
  The Odoo reference remains the source/menu evidence; no credentials, cookies,
  tokens, or passwords were read or recorded.

Screenshots, when available, stay outside Git under
/tmp/core3-odoo-parity/expenses-email-gateway-20260921/.
