-- 0001_initial_auth.sql
CREATE TABLE IF NOT EXISTS passes (
    id TEXT PRIMARY KEY,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS access_codes (
    code TEXT PRIMARY KEY,
    pass_id TEXT,
    duration_days INTEGER DEFAULT 30,
    status TEXT NOT NULL DEFAULT 'unused', -- 'unused', 'active', 'consumed'
    activated_at DATETIME,
    FOREIGN KEY(pass_id) REFERENCES passes(id)
);

CREATE TABLE IF NOT EXISTS device_sessions (
    id TEXT PRIMARY KEY,
    pass_id TEXT NOT NULL,
    device_fingerprint TEXT,
    last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(pass_id) REFERENCES passes(id)
);

CREATE INDEX IF NOT EXISTS idx_device_sessions_pass_id ON device_sessions(pass_id);
CREATE INDEX IF NOT EXISTS idx_access_codes_pass_id ON access_codes(pass_id);
