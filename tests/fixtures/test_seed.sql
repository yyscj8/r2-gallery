-- Seed data for tests
INSERT OR IGNORE INTO access_codes (code, status) VALUES
('DEMO-30DAYS-VALID', 'unused'),
('TEST-CARD-KEY-0001', 'unused'),
('TEST-CARD-KEY-0002', 'unused');

INSERT OR IGNORE INTO creators (id, handle, media_count) VALUES
('creator-alice', 'alice_style', 5),
('creator-bob', 'bob_travels', 5),
('creator-clara', 'clara_lens', 3);

INSERT OR IGNORE INTO media (id, creator_id, media_type, r2_key, poster_key, published_at, width, height) VALUES
('m-alice-1', 'creator-alice', 'image', 'media/alice_style/20261025_100000_1_photo1.jpg', NULL, '2026-10-25 10:00:00', 1080, 1350),
('m-alice-2', 'creator-alice', 'video', 'media/alice_style/20261024_153000_1_video1.mp4', 'posters/alice_style/20261024_153000_1_video1.webp', '2026-10-24 15:30:00', 1080, 1920),
('m-alice-3', 'creator-alice', 'image', 'media/alice_style/20261023_091500_1_photo2.jpg', NULL, '2026-10-23 09:15:00', 1080, 1080),
('m-alice-4', 'creator-alice', 'video', 'media/alice_style/20261022_184500_1_video2.mp4', 'posters/alice_style/20261022_184500_1_video2.webp', '2026-10-22 18:45:00', 1080, 1920),
('m-alice-5', 'creator-alice', 'image', 'media/alice_style/20261021_120000_1_photo3.jpg', NULL, '2026-10-21 12:00:00', 1080, 1350),

('m-bob-1', 'creator-bob', 'video', 'media/bob_travels/20261025_080000_1_video1.mp4', 'posters/bob_travels/20261025_080000_1_video1.webp', '2026-10-25 08:00:00', 1080, 1920),
('m-bob-2', 'creator-bob', 'image', 'media/bob_travels/20261024_140000_1_photo1.jpg', NULL, '2026-10-24 14:00:00', 1080, 1080),
('m-bob-3', 'creator-bob', 'video', 'media/bob_travels/20261023_193000_1_video2.mp4', 'posters/bob_travels/20261023_193000_1_video2.webp', '2026-10-23 19:30:00', 1080, 1920),
('m-bob-4', 'creator-bob', 'video', 'media/bob_travels/20261022_111000_1_video3.mp4', 'posters/bob_travels/20261022_111000_1_video3.webp', '2026-10-22 11:10:00', 1080, 1920),
('m-bob-5', 'creator-bob', 'image', 'media/bob_travels/20261020_160000_1_photo2.jpg', NULL, '2026-10-20 16:00:00', 1080, 1350),

('m-clara-1', 'creator-clara', 'image', 'media/clara_lens/20261025_090000_1_photo1.jpg', NULL, '2026-10-25 09:00:00', 1080, 1350),
('m-clara-2', 'creator-clara', 'video', 'media/clara_lens/20261023_170000_1_video1.mp4', 'posters/clara_lens/20261023_170000_1_video1.webp', '2026-10-23 17:00:00', 1080, 1920),
('m-clara-3', 'creator-clara', 'image', 'media/clara_lens/20261021_083000_1_photo2.jpg', NULL, '2026-10-21 08:30:00', 1080, 1080);
