import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createTestD1 } from '../helpers/d1-mock';
import { createTestR2 } from '../helpers/r2-mock';
import { createServer } from '../../src/server/app';

describe('API Seam: Internal Ingestion Endpoints', () => {
  let db: D1Database;
  let bucket: R2Bucket;
  let app: ReturnType<typeof createServer>;

  beforeEach(async () => {
    db = createTestD1();
    bucket = createTestR2();

    const schema1 = readFileSync(resolve(process.cwd(), 'd1/migrations/0001_initial_auth.sql'), 'utf8');
    const schema2 = readFileSync(resolve(process.cwd(), 'd1/migrations/0002_bookmarks.sql'), 'utf8');
    const schema3 = readFileSync(resolve(process.cwd(), 'd1/migrations/0003_creators_and_media.sql'), 'utf8');

    await db.exec(schema1);
    await db.exec(schema2);
    await db.exec(schema3);

    app = createServer({ DB: db, BUCKET: bucket });
  });

  it('rejects internal upload with invalid token', async () => {
    const res = await app.request('/api/internal/r2/media/test.jpg', {
      method: 'PUT',
      headers: { 'x-internal-token': 'wrong-token' },
      body: new Uint8Array([1, 2, 3]),
    });
    expect(res.status).toBe(401);
  });

  it('uploads binary to R2 and writes batch media metadata to D1 with valid token', async () => {
    const payload = new Uint8Array([10, 20, 30, 40]);
    const putRes = await app.request('/api/internal/r2/media/sample_creator/photo1.jpg', {
      method: 'PUT',
      headers: {
        'x-internal-token': 'cutie-dev-secret',
        'content-type': 'image/jpeg',
      },
      body: payload,
    });
    expect(putRes.status).toBe(200);

    const stored = await bucket.get('media/sample_creator/photo1.jpg');
    expect(stored).not.toBeNull();
    expect(stored?.size).toBe(4);

    const batchRes = await app.request('/api/internal/batch-media', {
      method: 'POST',
      headers: {
        'x-internal-token': 'cutie-dev-secret',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        creators: [{ id: 'c-test', handle: 'sample_creator', media_count: 1 }],
        media: [
          {
            id: 'm-test-1',
            creator_id: 'c-test',
            media_type: 'image',
            r2_key: 'media/sample_creator/photo1.jpg',
            poster_key: null,
            published_at: '2026-10-25 12:00:00',
            width: 1080,
            height: 1350,
          },
        ],
      }),
    });
    expect(batchRes.status).toBe(200);

    const row = await db.prepare('SELECT * FROM media WHERE id = ?').bind('m-test-1').first<any>();
    expect(row).toBeDefined();
    expect(row.creator_id).toBe('c-test');
    expect(row.r2_key).toBe('media/sample_creator/photo1.jpg');
  });
});
