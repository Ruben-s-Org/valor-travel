-- Usage analytics
CREATE TABLE IF NOT EXISTS usage_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tool_name TEXT NOT NULL,
  origin TEXT,
  destination TEXT,
  departure_date TEXT,
  return_date TEXT,
  passengers INTEGER DEFAULT 1,
  cabin_class TEXT DEFAULT 'economy',
  ip_hash TEXT,
  user_agent TEXT,
  cached INTEGER DEFAULT 0,
  response_time_ms INTEGER,
  error TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
  ip_hash TEXT NOT NULL,
  date TEXT NOT NULL,
  call_count INTEGER DEFAULT 0,
  PRIMARY KEY (ip_hash, date)
);

-- Daily aggregates
CREATE TABLE IF NOT EXISTS daily_stats (
  date TEXT PRIMARY KEY,
  total_calls INTEGER DEFAULT 0,
  unique_ips INTEGER DEFAULT 0,
  cache_hits INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  avg_response_ms REAL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_usage_created ON usage_log(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_tool ON usage_log(tool_name);
CREATE INDEX IF NOT EXISTS idx_rate_limits_date ON rate_limits(date);
