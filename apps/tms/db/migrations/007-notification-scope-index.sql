-- Shell notification reads and read-state updates are always user-scoped.
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON notifications(user_id, read, created_at);
