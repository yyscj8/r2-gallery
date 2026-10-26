import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createTestD1 } from '../helpers/d1-mock';
import { createServer } from '../../src/server/app';

describe('API Seam: Authentication & Pass Redemption', () => {
  let db: D1Database;
  let app: ReturnType<typeof createServer>;

  beforeEach(async () => {
    db = createTestD1();
    // Load schema
    const schema = readFileSync(
      resolve(process.cwd(), 'd1/migrations/0001_initial_auth.sql'),
      'utf8'
    );
    await db.exec(schema);

    // Seed test code
    await db
      .prepare(
        "INSERT INTO access_codes (code, duration_days, status) VALUES ('CUTIE-TEST-1234', 30, 'unused')"
      )
      .run();

    app = createServer({ DB: db } as any);
  });

  it('rejects an invalid or non-existent Access Code with 400', async () => {
    const res = await app.request('/api/auth/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'INVALID-CODE' }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toHaveProperty('error');
  });

  it('redeems a valid unused Access Code, creates a 30-day Pass, and sets HttpOnly cookie', async () => {
    const res = await app.request('/api/auth/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'CUTIE-TEST-1234' }),
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.success).toBe(true);
    expect(data.days_remaining).toBe(30);

    // Verify Set-Cookie header
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain('session_id=');
    expect(setCookie?.toLowerCase()).toContain('httponly');

    // Extract cookie
    const sessionIdMatch = setCookie?.match(/session_id=([^;]+)/);
    const cookie = `session_id=${sessionIdMatch?.[1]}`;

    // Verify GET /api/auth/me with cookie
    const meRes = await app.request('/api/auth/me', {
      headers: { Cookie: cookie },
    });
    expect(meRes.status).toBe(200);
    const meData = (await meRes.json()) as any;
    expect(meData.authenticated).toBe(true);
    expect(meData.days_remaining).toBe(30);
  });

  it('rejects unauthenticated requests to /api/auth/me with 401', async () => {
    const res = await app.request('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('allows user to logout, invalidating session and clearing cookie', async () => {
    // 1. Redeem
    const redeemRes = await app.request('/api/auth/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'CUTIE-TEST-1234' }),
    });
    const setCookie = redeemRes.headers.get('set-cookie')!;
    const sessionIdMatch = setCookie.match(/session_id=([^;]+)/);
    const cookie = `session_id=${sessionIdMatch?.[1]}`;

    // 2. Logout
    const logoutRes = await app.request('/api/auth/logout', {
      method: 'POST',
      headers: { Cookie: cookie },
    });
    expect(logoutRes.status).toBe(200);

    // 3. Me should now be 401
    const meRes = await app.request('/api/auth/me', {
      headers: { Cookie: cookie },
    });
    expect(meRes.status).toBe(401);
  });
});
