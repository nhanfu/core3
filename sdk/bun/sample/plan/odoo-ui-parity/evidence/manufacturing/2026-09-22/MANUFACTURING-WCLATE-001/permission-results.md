# Permission results

Verified by the focused suite. The datasource requires `manufacturing.read`; all
operator actions must require `manufacturing.write`; unauthenticated,
forbidden, and transport-error states must be explicit. Create and delete are
intentionally absent, matching the source Work Orders action.
