# Verification

## Odoo reference

Using browser instance `245ea108` and the existing authenticated local QA
session, the Events menu opened `Design Fair Los Angeles` in
`core3_reference`. Send message was opened and captured at 1916x833, then the
same composer was observed and captured at 390x844. The session was stopped
cleanly after the captures.

## Core3

The bounded module runner reached `http://localhost:4026`, but the user
requested browser sessions be closed before a new authenticated Core3 action
pass. Consequently no Core3 screenshot or authenticated interaction claim is
made in this evidence folder.

## Blockers

No Odoo source or reference blocker occurred. Core3 browser evidence is open
only because the requested session closure happened before the authenticated
Core3 desktop/mobile pass. Broader Events actor permissions and complete
route-level paired visual coverage remain module-level gates.
