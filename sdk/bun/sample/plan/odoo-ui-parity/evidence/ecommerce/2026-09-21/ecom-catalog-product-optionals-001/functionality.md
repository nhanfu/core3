# Functional evidence

- Migrations 072/073 replay without duplicate rows and seed deterministic Mug
  → Lamp and Chair → Mug optional assignments.
- The recommendation query returns only active published same-company targets;
  an Other Company scope returns no rows.
- Wrong-company source, unpublished target, self-target, and duplicate
  assignment requests are rejected before persistence.
- A valid optional can be added to the open cart repeatedly; the deterministic
  line remains unique and its quantity increments.
- Removal requires the current relation row version; a stale version returns
  the declared conflict and leaves the assignment intact.
- Closing and reopening DuckDB preserves the created relation, sequence, row
  version, and deterministic fixtures.

The focused proof is service/API and persistence evidence. It does not claim a
rendered browser pass or full Ecommerce sign-off.
