# SURVEYS-CERTIFICATION-PREVIEW-001

Bounded Surveys action: Odoo's certification-template Preview action.

Core3 adds the `preview_survey_certification` action to the existing
`survey-detail` page. It opens the page/API pair
`survey-certification-preview` in a new tab, renders the selected durable
certification layout with the shared `TemplatePreview` primitive, and keeps
Print/Back actions available. Only active certified surveys are previewable;
missing, non-certified, and archived surveys resolve to an empty datasource
and the declared not-found/permission states.

This slice intentionally does not claim byte-for-byte PDF generation. Odoo's
route creates a temporary test answer and streams a report PDF; Core3's
bounded YAML-first equivalent renders a safe, printable template preview from
the persisted certification layout and deterministic preview context.

Evidence files:

- `source-comparison.md` — Odoo source and Core3 contract comparison.
- `test-results.md` — focused and adjacent regression results.
- `browser-check.md` — live Odoo action capture and exact BrowserSkill/mobile
  blockers.
- `odoo-desktop.png` — live Odoo Preview route at desktop size.

No Core3 authenticated screenshot or visual-parity sign-off is claimed because
the shared authenticated Odoo tab was owned by another BrowserSkill session
and Chrome blocked mobile CDP access to an extension frame.
