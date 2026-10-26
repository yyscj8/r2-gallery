import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createTestD1 } from '../helpers/d1-mock';
import { createTestR2 } from '../helpers/r2-mock';
import { createServer } from '../../src/server/app';

describe('API Seam: Authenticated R2 Streaming Proxy & Posters', () => {
  let db: D1Database;
  let bucket: R2Bucket;
  let app: ReturnType<typeof createServer>;
  let sessionCookie: string;

  beforeEach(async () => {
    db = createTestD1();
    bucket = createTestR2();

    const schema1 = readFileSync(resolve(process.cwd(), 'd1/migrations/0001_initial_auth.sql'), 'utf8');
    const schema2 = readFileSync(resolve(process.cwd(), 'd1/migrations/0002_bookmarks.sql'), 'utf8');
    const schema3 = readFileSync(resolve(process.cwd(), 'd1/migrations/0003_creators_and_media.sql'), 'utf8');

    await db.exec(schema1);
    await db.exec(schema2);
    await db.exec(schema3);

    // Seed creator and media
    await db.prepare("INSERT INTO creators (id, handle) VALUES ('c-1', 'test_creator')").run();
    await db.prepare(`
      INSERT INTO media (id, creator_id, media_type, r2_key, poster_key, published_at)
      VALUES ('vid-1', 'c-1', 'video', 'media/test/sample.mp4', 'posters/test/sample.webp', '2026-10-25 12:00:00')
    `).run();

    // Populate mock R2 data (1000 bytes for video, 100 bytes for poster)
    const videoData = new Uint8Array(1000);
    for (let i = 0; i < 1000; i++) videoData[i] = i % 256;
    await bucket.put('media/test/sample.mp4', videoData, {
      httpMetadata: { contentType: 'video/mp4' },
    });

    const posterData = new Uint8Array(100);
    await bucket.put('posters/test/sample.webp', posterData, {
      httpMetadata: { contentType: 'image/webp' },
    });

    // Session
    const passId = 'test-pass-stream';
    await db.prepare('INSERT INTO passes (id, expires_at) VALUES (?, ?)').bind(passId, new Date(Date.now() + 30 * 86400000).toISOString()).run();
    const sessionId = 'test-session-stream';
    await db.prepare('INSERT INTO device_sessions (id, pass_id) VALUES (?, ?)').bind(sessionId, passId).run();

    sessionCookie = `session_id=${sessionId}`;
    app = createServer({ DB: db, BUCKET: bucket } as any);
  });

  it('rejects unauthenticated requests to streaming endpoints with 401', async () => {
    const streamRes = await app.request('/api/stream/vid-1');
    expect(streamRes.status).toBe(401);

    const posterRes = await app.request('/api/posters/vid-1');
    expect(posterRes.status).toBe(401);
  });

  it('streams full media body when no Range header is provided with 200 OK', async () => {
    const res = await app.request('/api/stream/vid-1', {
      headers: { Cookie: sessionCookie },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('accept-ranges')).toBe('bytes');
    expect(res.headers.get('cache-control')).toContain('private');
    expect(res.headers.get('content-type')).toBe('video/mp4');

    const bytes = await res.arrayBuffer();
    expect(bytes.byteLength).toBe(1000);
  });

  it('handles HTTP Range requests returning 206 Partial Content and Content-Range', async () => {
    const res = await app.request('/api/stream/vid-1', {
      headers: {
        Cookie: sessionCookie,
        Range: 'bytes=0-99',
      },
    });

    expect(res.status).toBe(206);
    expect(res.headers.get('content-range')).toBe('bytes 0-99/1000');
    expect(res.headers.get('accept-ranges')).toBe('bytes');

    const bytes = await res.arrayBuffer();
    expect(bytes.byteLength).toBe(100);
  });

  it('serves pre-rendered WebP Posters via /api/posters/:id', async () => {
    const res = await app.request('/api/posters/vid-1', {
      headers: { Cookie: sessionCookie },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/webp');
    expect(res.headers.get('cache-control')).toContain('private');

    const bytes = await res.arrayBuffer();
    expect(bytes.byteLength).toBe(100);
  });
});
