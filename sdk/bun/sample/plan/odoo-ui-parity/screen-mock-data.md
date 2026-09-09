# Backend YAML mock-data — sub-plan

Status: `planning`

## Goal

Every Core3 screen backend must carry the deterministic data needed to render its
UI in YAML. Opening a UI route must never depend on a live database merely to
display Odoo-equivalent content. Page-layout YAML continues to name datasources;
it does not contain fixture records.

## Proposed backend datasource contract

Each backend datasource YAML declares either a mock provider now or a query later:

```yaml
page: { id: contacts }
datasources:
  - id: contacts
    mock_data:
      default:
        - { id: contact-acme, name: Acme Corporation, type: company }
      states:
        archived: []
  - id: contact_summary
    mock_data:
      default: { total: 24, companies: 8, people: 16 }
```

- `mock_data.default` supplies the normal populated state.
- `mock_data.states` declares named UI states such as filtered, empty, search,
  paginated, dialog, mobile, or error variations.
- Later, `mock_data` is replaced by `query` on the same datasource ID; the page
  YAML and all UI components stay unchanged.
- Chart/report sources contain the exact categories, labels, values, totals, and
  table rows visible in the matching Odoo screen.
- Form pages include the record, relational dropdown options, tabs, chatter,
  attachments, activities, and smart-button counts necessary for the captured
  state.

## Runtime work required before screen conversion

1. Extend backend datasource-schema validation to accept `mock_data`.
2. Extend the datasource resolver to return backend mock data in UI-only mode,
   resolved by datasource and requested state, before any database query.
3. Keep database-backed datasources unchanged for later backend work.
4. Add a route test proving a page renders from YAML mock data with no database.
5. Add an audit that fails when a page component references a backend datasource
   without a matching `mock_data` declaration.

## Per-screen acceptance criteria

- Every visible Odoo state has a named or default YAML data fixture.
- No chart, report, pivot, dashboard, table, kanban, calendar, or form field is
  blank because a datasource has no records.
- Mock data is stable across runs and sufficient for desktop and mobile captures.
- The screen can render with the backend unavailable.
