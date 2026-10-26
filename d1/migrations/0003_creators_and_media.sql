-- 0003_creators_and_media.sql
CREATE TABLE IF NOT EXISTS creators (
    id TEXT PRIMARY KEY,
    handle TEXT UNIQUE NOT NULL,
    media_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY,
    creator_id TEXT NOT NULL,
    media_type TEXT NOT NULL, -- 'image' or 'video'
    r2_key TEXT NOT NULL,
    poster_key TEXT,
    published_at DATETIME NOT NULL,
    width INTEGER,
    height INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(creator_id) REFERENCES creators(id)
);

CREATE INDEX IF NOT EXISTS idx_media_creator ON media(creator_id);
CREATE INDEX IF NOT EXISTS idx_media_published_at ON media(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_type ON media(media_type);
