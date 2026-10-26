import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createTestD1 } from '../helpers/d1-mock';
import { createServer } from '../../src/server/app';

describe('API Seam: Multi-Device Session Limit & Eviction', () => {
  let db: D1Database;
  let app: ReturnType<typeof createServer>;

  beforeEach(async () => {
    db = createTestD1();
    const schema = readFileSync(
      resolve(process.cwd(), 'd1/migrations/0001_initial_auth.sql'),
      'utf8'
    );
    await db.exec(schema);

    await db
      .prepare(
        "INSERT INTO access_codes (code, duration_days, status) VALUES ('CUTIE-DEVICE-TEST', 30, 'unused')"
      )
      .run();

    app = createServer({ DB: db } as any);
  });

  it('allows 2 concurrent devices, and evicts the oldest device when a 3rd logs in', async () => {
    // 1. Device 1 logs in
    const res1 = await app.request('/api/auth/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'CUTIE-DEVICE-TEST' }),
    });
    expect(res1.status).toBe(200);
    const cookie1 = `session_id=${res1.headers.get('set-cookie')?.match(/session_id=([^;]+)/)?.[1]}`;

    // 2. Device 2 logs in with same code
    const res2 = await app.request('/api/auth/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'CUTIE-DEVICE-TEST' }),
    });
    expect(res2.status).toBe(200);
    const cookie2 = `session_id=${res2.headers.get('set-cookie')?.match(/session_id=([^;]+)/)?.[1]}`;

    // Verify both Device 1 and Device 2 are active
    const me1 = await app.request('/api/auth/me', { headers: { Cookie: cookie1 } });
    expect(me1.status).toBe(200);

    const me2 = await app.request('/api/auth/me', { headers: { Cookie: cookie2 } });
    expect(me2.status).toBe(200);

    // 3. Device 3 logs in with same code
    const res3 = await app.request('/api/auth/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'CUTIE-DEVICE-TEST' }),
    });
    expect(res3.status).toBe(200);
    const cookie3 = `session_id=${res3.headers.get('set-cookie')?.match(/session_id=([^;]+)/)?.[1]}`;

    // Verify Device 3 is active
    const me3 = await app.request('/api/auth/me', { headers: { Cookie: cookie3 } });
    expect(me3.status).toBe(200);

    // Verify Device 2 is still active
    const me2After = await app.request('/api/auth/me', { headers: { Cookie: cookie2 } });
    expect(me2After.status).toBe(200);

    // Verify Device 1 has been evicted!
    const me1After = await app.request('/api/auth/me', { headers: { Cookie: cookie1 } });
    expect(me1After.status).toBe(401);
    const me1Data = (await me1After.json()) as any;
    expect(me1Data.evicted).toBe(true);
  });
});
