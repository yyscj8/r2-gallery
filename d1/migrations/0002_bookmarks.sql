-- 0002_bookmarks.sql
CREATE TABLE IF NOT EXISTS bookmarks (
    pass_id TEXT NOT NULL,
    media_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(pass_id, media_id),
    FOREIGN KEY(pass_id) REFERENCES passes(id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_pass_id ON bookmarks(pass_id);
