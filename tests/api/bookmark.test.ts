import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createTestD1 } from '../helpers/d1-mock';
import { createServer } from '../../src/server/app';

describe('API Seam: Bookmark Toggling & Cross-Device Sync', () => {
  let db: D1Database;
  let app: ReturnType<typeof createServer>;
  let cookieDevice1: string;
  let cookieDevice2: string;

  beforeEach(async () => {
    db = createTestD1();
    const schema1 = readFileSync(resolve(process.cwd(), 'd1/migrations/0001_initial_auth.sql'), 'utf8');
    const schema2 = readFileSync(resolve(process.cwd(), 'd1/migrations/0002_bookmarks.sql'), 'utf8');
    const schema3 = readFileSync(resolve(process.cwd(), 'd1/migrations/0003_creators_and_media.sql'), 'utf8');
    const seed = readFileSync(resolve(process.cwd(), 'tests/fixtures/test_seed.sql'), 'utf8');

    await db.exec(schema1);
    await db.exec(schema2);
    await db.exec(schema3);
    await db.exec(seed);

    // Single Pass shared by 2 devices
    const passId = 'shared-pass-1';
    await db
      .prepare('INSERT INTO passes (id, expires_at) VALUES (?, ?)')
      .bind(passId, new Date(Date.now() + 30 * 86400000).toISOString())
      .run();

    // Session 1 (Device 1)
    await db.prepare('INSERT INTO device_sessions (id, pass_id) VALUES (?, ?)').bind('sess-dev-1', passId).run();
    cookieDevice1 = 'session_id=sess-dev-1';

    // Session 2 (Device 2)
    await db.prepare('INSERT INTO device_sessions (id, pass_id) VALUES (?, ?)').bind('sess-dev-2', passId).run();
    cookieDevice2 = 'session_id=sess-dev-2';

    app = createServer({ DB: db } as any);
  });

  it('rejects unauthenticated requests to bookmark endpoint with 401', async () => {
    const res = await app.request('/api/media/m-alice-1/bookmark', { method: 'POST' });
    expect(res.status).toBe(401);
  });

  it('toggles bookmark on and off, synchronizing state between Device 1 and Device 2', async () => {
    // 1. Device 1 bookmarks m-alice-1
    const res1 = await app.request('/api/media/m-alice-1/bookmark', {
      method: 'POST',
      headers: { Cookie: cookieDevice1 },
    });
    expect(res1.status).toBe(200);
    const data1 = (await res1.json()) as any;
    expect(data1.bookmarked).toBe(true);

    // 2. Device 2 queries media feed with bookmarked_only=true
    const dev2Res = await app.request('/api/media?bookmarked_only=true', {
      headers: { Cookie: cookieDevice2 },
    });
    expect(dev2Res.status).toBe(200);
    const dev2Data = (await dev2Res.json()) as any;
    expect(dev2Data.items).toHaveLength(1);
    expect(dev2Data.items[0].id).toBe('m-alice-1');
    expect(dev2Data.items[0].is_bookmarked).toBe(true);

    // 3. Device 2 toggles bookmark off
    const res2 = await app.request('/api/media/m-alice-1/bookmark', {
      method: 'POST',
      headers: { Cookie: cookieDevice2 },
    });
    expect(res2.status).toBe(200);
    const data2 = (await res2.json()) as any;
    expect(data2.bookmarked).toBe(false);

    // 4. Device 1 queries bookmarked_only -> now empty!
    const dev1Res = await app.request('/api/media?bookmarked_only=true', {
      headers: { Cookie: cookieDevice1 },
    });
    const dev1Data = (await dev1Res.json()) as any;
    expect(dev1Data.items).toHaveLength(0);
  });
});
