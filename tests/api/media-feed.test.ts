import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createTestD1 } from '../helpers/d1-mock';
import { createServer } from '../../src/server/app';

describe('API Seam: Media Feed & Creator Taxonomy', () => {
  let db: D1Database;
  let app: ReturnType<typeof createServer>;
  let sessionCookie: string;

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
    const schema3 = readFileSync(
      resolve(process.cwd(), 'd1/migrations/0003_creators_and_media.sql'),
      'utf8'
    );
    const seed = readFileSync(resolve(process.cwd(), 'tests/fixtures/test_seed.sql'), 'utf8');

    await db.exec(schema1);
    await db.exec(schema2);
    await db.exec(schema3);
    await db.exec(seed);

    // Create active pass & session
    const passId = 'test-pass-media';
    await db
      .prepare('INSERT INTO passes (id, expires_at) VALUES (?, ?)')
      .bind(passId, new Date(Date.now() + 30 * 86400000).toISOString())
      .run();

    const sessionId = 'test-session-media';
    await db
      .prepare('INSERT INTO device_sessions (id, pass_id) VALUES (?, ?)')
      .bind(sessionId, passId)
      .run();

    sessionCookie = `session_id=${sessionId}`;
    app = createServer({ DB: db } as any);
  });

  it('rejects unauthenticated requests to /api/creators and /api/media with 401', async () => {
    const creatorsRes = await app.request('/api/creators');
    expect(creatorsRes.status).toBe(401);

    const mediaRes = await app.request('/api/media');
    expect(mediaRes.status).toBe(401);
  });

  it('returns creators list with media counts and supports search query', async () => {
    const res = await app.request('/api/creators', {
      headers: { Cookie: sessionCookie },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.creators).toHaveLength(3);

    // Search for 'alice'
    const searchRes = await app.request('/api/creators?q=alice', {
      headers: { Cookie: sessionCookie },
    });
    const searchData = (await searchRes.json()) as any;
    expect(searchData.creators).toHaveLength(1);
    expect(searchData.creators[0].handle).toBe('alice_style');
    expect(searchData.creators[0].media_count).toBe(5);
  });

  it('returns paginated media items ordered by published_at DESC', async () => {
    const res = await app.request('/api/media?limit=5', {
      headers: { Cookie: sessionCookie },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.items).toHaveLength(5);
    expect(data.next_cursor).toBeTruthy();

    // Verify descending order
    for (let i = 0; i < data.items.length - 1; i++) {
      const currTime = new Date(data.items[i].published_at).getTime();
      const nextTime = new Date(data.items[i + 1].published_at).getTime();
      expect(currTime).toBeGreaterThanOrEqual(nextTime);
    }

    // Fetch next page with cursor
    const page2Res = await app.request(`/api/media?limit=5&cursor=${encodeURIComponent(data.next_cursor)}`, {
      headers: { Cookie: sessionCookie },
    });
    const page2Data = (await page2Res.json()) as any;
    expect(page2Data.items).toHaveLength(5);
    expect(page2Data.items[0].id).not.toBe(data.items[0].id);
  });

  it('filters media by creator_id and media_type', async () => {
    // Only alice videos
    const res = await app.request('/api/media?creator_id=creator-alice&media_type=video', {
      headers: { Cookie: sessionCookie },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.items).toHaveLength(2);
    expect(data.items.every((item: any) => item.creator_id === 'creator-alice')).toBe(true);
    expect(data.items.every((item: any) => item.media_type === 'video')).toBe(true);
  });
});
