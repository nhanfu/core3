-- Branch-scoped list and report queries need indexes on their declared scope.
CREATE INDEX IF NOT EXISTS idx_quotes_branch ON quotes(branch_id);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_branch ON accounting_entries(branch_id);
