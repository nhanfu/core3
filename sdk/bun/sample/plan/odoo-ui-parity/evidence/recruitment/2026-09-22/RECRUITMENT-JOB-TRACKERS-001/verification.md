# Verification

The implementation is limited to Recruitment-owned page/API/migration/test
files plus the existing Recruitment opening detail binding. It preserves the
YAML-first page/API separation and uses the existing ListView/server-form
primitives. The live Odoo comparison could not be performed because the
authenticated shared tab was borrowed by another BrowserSkill session; this
batch is functionally verified only and does not sign off Recruitment visual
parity.
