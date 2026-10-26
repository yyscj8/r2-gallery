import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createTestD1 } from '../helpers/d1-mock';
import { createServer } from '../../src/server/app';

describe('API Seam: Pass Renewal & Bookmarks Merge', () => {
  let db: D1Database;
  let app: ReturnType<typeof createServer>;

  beforeEach(async () => {
    db = createTestD1();
    const schema1 = readFileSync(
      resolve(process.cwd(), 'd1/migrations/0001_initial_auth.sql'),
      'utf8'
    );
    const schema2 = readFileSync(
      resolve(process.cwd(), 'd1/migrations/0002_bookmarks.sql'),
      'utf8'
    );
    await db.exec(schema1);
    await db.exec(schema2);

    app = createServer({ DB: db } as any);
  });

  it('extends an active Pass by 30 days without losing remaining days when renewed early', async () => {
    // Initial Pass with 10 days remaining
    const passId = 'test-pass-early';
    const futureDate = new Date(Date.now() + 10 * 86400000);
    await db
      .prepare('INSERT INTO passes (id, expires_at) VALUES (?, ?)')
      .bind(passId, futureDate.toISOString())
      .run();

    // Session for this pass
    const sessionId = 'test-session-1';
    await db
      .prepare('INSERT INTO device_sessions (id, pass_id) VALUES (?, ?)')
      .bind(sessionId, passId)
      .run();

    // New unused renewal code
    await db
      .prepare(
        "INSERT INTO access_codes (code, duration_days, status) VALUES ('RENEW-EARLY', 30, 'unused')"
      )
      .run();

    // User submits renewal code while logged in
    const res = await app.request('/api/auth/redeem', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `session_id=${sessionId}`,
      },
      body: JSON.stringify({ code: 'RENEW-EARLY' }),
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.success).toBe(true);
    // Should now have ~40 days remaining (10 remaining + 30 new)
    expect(data.days_remaining).toBeGreaterThanOrEqual(39);
    expect(data.days_remaining).toBeLessThanOrEqual(41);
  });

  it('renews an expired Pass by 30 days starting from now', async () => {
    // Expired Pass (expired 5 days ago)
    const passId = 'test-pass-expired';
    const pastDate = new Date(Date.now() - 5 * 86400000);
    await db
      .prepare('INSERT INTO passes (id, expires_at) VALUES (?, ?)')
      .bind(passId, pastDate.toISOString())
      .run();

    const sessionId = 'test-session-expired';
    await db
      .prepare('INSERT INTO device_sessions (id, pass_id) VALUES (?, ?)')
      .bind(sessionId, passId)
      .run();

    // New unused renewal code
    await db
      .prepare(
        "INSERT INTO access_codes (code, duration_days, status) VALUES ('RENEW-EXPIRED', 30, 'unused')"
      )
      .run();

    // Submit renewal
    const res = await app.request('/api/auth/redeem', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `session_id=${sessionId}`,
      },
      body: JSON.stringify({ code: 'RENEW-EXPIRED' }),
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.success).toBe(true);
    expect(data.days_remaining).toBe(30);
  });

  it('detects an expired old Access Code entered on a new clean device and returns renewal prompt with pass_id', async () => {
    const passId = 'old-expired-pass';
    const pastDate = new Date(Date.now() - 2 * 86400000);
    await db
      .prepare('INSERT INTO passes (id, expires_at) VALUES (?, ?)')
      .bind(passId, pastDate.toISOString())
      .run();

    await db
      .prepare(
        "INSERT INTO access_codes (code, pass_id, duration_days, status) VALUES ('OLD-CODE-1', ?, 30, 'active')"
      )
      .bind(passId)
      .run();

    // Clean device enters OLD-CODE-1
    const res = await app.request('/api/auth/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'OLD-CODE-1' }),
    });

    // Should return 403 with expired: true and pass_id to guide renewal
    expect(res.status).toBe(403);
    const data = (await res.json()) as any;
    expect(data.expired).toBe(true);
    expect(data.pass_id).toBe(passId);
  });

  it('merges historical bookmarks from an old Pass into the active Pass via POST /api/auth/merge', async () => {
    // Old Pass with 2 bookmarks
    const oldPassId = 'old-pass-bookmarks';
    await db
      .prepare('INSERT INTO passes (id, expires_at) VALUES (?, ?)')
      .bind(oldPassId, new Date(Date.now() - 1000).toISOString())
      .run();

    await db
      .prepare(
        "INSERT INTO access_codes (code, pass_id, duration_days, status) VALUES ('OLD-BOOKMARK-CODE', ?, 30, 'active')"
      )
      .bind(oldPassId)
      .run();

    await db
      .prepare('INSERT INTO bookmarks (pass_id, media_id) VALUES (?, ?)')
      .bind(oldPassId, 'media-1')
      .run();
    await db
      .prepare('INSERT INTO bookmarks (pass_id, media_id) VALUES (?, ?)')
      .bind(oldPassId, 'media-2')
      .run();

    // New active Pass
    const currentPassId = 'new-active-pass';
    await db
      .prepare('INSERT INTO passes (id, expires_at) VALUES (?, ?)')
      .bind(currentPassId, new Date(Date.now() + 30 * 86400000).toISOString())
      .run();

    const currentSessionId = 'current-session';
    await db
      .prepare('INSERT INTO device_sessions (id, pass_id) VALUES (?, ?)')
      .bind(currentSessionId, currentPassId)
      .run();

    // Current user also has media-2 already bookmarked
    await db
      .prepare('INSERT INTO bookmarks (pass_id, media_id) VALUES (?, ?)')
      .bind(currentPassId, 'media-2')
      .run();

    // Call /api/auth/merge
    const mergeRes = await app.request('/api/auth/merge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `session_id=${currentSessionId}`,
      },
      body: JSON.stringify({ old_code: 'OLD-BOOKMARK-CODE' }),
    });

    expect(mergeRes.status).toBe(200);
    const mergeData = (await mergeRes.json()) as any;
    expect(mergeData.success).toBe(true);

    // Verify current Pass now has media-1 and media-2
    const currentBookmarks = await db
      .prepare('SELECT media_id FROM bookmarks WHERE pass_id = ? ORDER BY media_id ASC')
      .bind(currentPassId)
      .all<{ media_id: string }>();

    expect(currentBookmarks.results.map((b) => b.media_id)).toEqual(['media-1', 'media-2']);
  });
});
