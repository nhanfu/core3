# Verification

Date: 2026-09-22. BrowserSkill instance: `245ea108`.

## BrowserSkill setup and blocker

`bsk status --json` confirmed BrowserSkill daemon/protocol 1.3 and a connected
Chrome extension on instance `245ea108`. A task session `wqul` was started.
The user tab list showed Odoo tab `1770662590` in user scope at
`http://localhost:8069/odoo/contacts/9`.

The required command was issued once:

```text
bsk tab borrow 1770662590 --session wqul --timeout 120s
```

The command waited for the configured browser borrow confirmation and did not
acquire the tab. After the wait, the tab list still showed tab `1770662590`
as `user` scope. Reusing the affected session then returned:

```text
error: previous session command is still running
hint: wait for the current command to finish, cancel it with Ctrl-C, or stop/restart the session
details: session already has an unfinished command
```

No independent browser, login, credential, cookie, token, or alternate Odoo
session was used. Because the tab was never borrowed, no Odoo action was
observed or screenshot captured in this run, and no desktop/mobile visual
parity claim is made. No screenshot paths are asserted as captured.

## Core3 verification

The source-backed contract and persistence verification are recorded in
`test-results.md`. Authenticated Core3 browser verification was not attempted
through another backend because it would violate the required shared-tab
workflow. The remaining visual case is explicitly blocked pending a successful
borrow of the existing tab (and an authenticated Core3 session available in
that same shared browser).

## Cleanup

The borrow attempt acquired no tab, so there was no borrowed tab to return.
The task-created BrowserSkill session must be stopped during handoff; stopping
it does not alter the user’s Odoo tab.
