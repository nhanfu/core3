# Verification assertions

The focused test verifies:

1. Page/API contracts remain separate and join by matching `page.id`.
2. Two selected pool talents and two selected jobs create four rows, including
   duplicate candidate names and source links.
3. Missing selection, missing member, archived/cross-company source, invalid
   position, and missing actor fail before any insert.
4. The source member reports one created application after file-backed reopen.
5. Applicant detail creation rejects stale `row_version` and non-pool sources,
   then creates a valid application for a current pool applicant.

No browser result is inferred from these repository assertions.
