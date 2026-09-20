# Surveys public retry evidence

Feature: `SURVEYS-PUBLIC-RETRY-001`
Date: 2026-09-20
Core3 runtime: `http://127.0.0.1:4017`, isolated `CORE3_MODULES=surveys` runtime
Odoo runtime: `http://127.0.0.1:8069`, authenticated session for `core3_reference`

This evidence covers Odoo's public retry route after a completed attempt. Core3
creates a fresh durable in-progress response, preserves respondent context,
supports idempotent replay, and resumes the new token after a DuckDB reopen.

Core3 browser screenshots and JSON are paired at desktop `1440x900` and mobile
`390x844`. Odoo screenshots record the reachable authenticated reference's
exact retry blocker. No full Surveys sign-off is claimed.
