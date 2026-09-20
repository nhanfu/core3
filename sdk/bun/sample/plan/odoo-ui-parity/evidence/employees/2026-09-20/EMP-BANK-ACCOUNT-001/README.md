# EMP-BANK-ACCOUNT-001 evidence

Authenticated Core3 and Odoo desktop/mobile captures and browser result JSON
for employee Personal bank accounts and salary allocation.

Core3 login and company switching succeeded, but the active company was
Core3 Vietnam Branch while deterministic fixtures belong to Core3 Vietnam,
so the authenticated detail was empty. Odoo login and list/detail navigation
succeeded, but all 24 reference employees had empty bank_account_ids; a
populated Odoo allocation grid/modal was therefore unavailable.

The captures prove authenticated navigation and record-scope boundaries. They
do not claim populated UI parity or aggregate Employees sign-off.
