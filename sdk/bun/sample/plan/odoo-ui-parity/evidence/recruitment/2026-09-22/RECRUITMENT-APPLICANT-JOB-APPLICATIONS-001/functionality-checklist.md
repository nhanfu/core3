# Functionality checklist

- [x] Stable action ID and page/API `page.id` join.
- [x] Talent list selection and `Create Applications` form.
- [x] Pool-applicant detail header action; hidden for non-pool applicants.
- [x] Required multi-job selector and `Move to...` placeholder.
- [x] One durable application per selected talent/job pair.
- [x] Preserve applicant name, email, phone, source, recruiter, rating,
  priority, department, notes, and company.
- [x] Set first non-folded stage, active state, fixed applied/created dates,
  and source `pool_applicant_id`.
- [x] Empty selection, empty job selection, actor, missing applicant,
  archived/cross-company, and invalid-position guards.
- [x] Detail stale-row guard with no partial write.
- [x] Visible application count after query/reload and file-backed restart.
- [ ] Authenticated Odoo/Core3 desktop screenshot comparison.
- [ ] Authenticated Odoo/Core3 mobile screenshot comparison.

The final two cases are blocked by the unavailable borrowed authenticated tab;
they are not marked pass.
