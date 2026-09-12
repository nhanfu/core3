# Appraisals detailed QA test plan

Module: appraisals  
QA owner: appraisals-qa  
Developer owner: appraisals module owner  
Reference addon/version: hr_appraisal, Odoo 19 Community  
Plan status: blocked — reference addon unavailable

This plan follows [`appraisals.md`](../../appraisals.md). No implementation or parity sign-off may proceed until the addon/source and live menu/action tree are available.

Required re-entry gates: verify source manifest/demo data; inventory appraisals, templates, skills, feedback, goals and reporting; declare YAML/API/permission contracts; add deterministic fixtures and migrations; run focused tests, authenticated CRUD/workflows, actor boundaries, restart persistence, and paired desktop/mobile Odoo captures. Durable reviews/notifications use Temporal with retry/replay/restart evidence.
