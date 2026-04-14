CREATE TABLE IF NOT EXISTS transfers (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'uploading',
  object_key TEXT NOT NULL UNIQUE,
  upload_id TEXT,
  title TEXT NOT NULL,
  message TEXT,
  original_filename TEXT NOT NULL,
  storage_filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  expires_in_days INTEGER NOT NULL CHECK (expires_in_days IN (1, 3)),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  completed_at INTEGER,
  download_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_transfers_status_expires_at
  ON transfers (status, expires_at);

CREATE INDEX IF NOT EXISTS idx_transfers_expires_at
  ON transfers (expires_at);
