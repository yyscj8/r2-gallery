import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';

export interface Env {
  DB: D1Database;
  BUCKET?: R2Bucket;
  INTERNAL_TOKEN?: string;
}

export function createServer(envOverride?: Env) {
  const app = new Hono<{ Bindings: Env }>();

  // Use injected env for testing or worker env in runtime
  app.use('*', async (c, next) => {
    if (envOverride) {
      c.env = { ...c.env, ...envOverride };
    }
    await next();
  });

  // POST /api/auth/redeem
  app.post('/api/auth/redeem', async (c) => {
    const { code, pass_id: explicitPassId } = await c.req.json<{
      code?: string;
      pass_id?: string;
    }>();

    if (!code || typeof code !== 'string') {
      return c.json({ error: 'Access Code is required' }, 400);
    }

    const trimmedCode = code.trim().toUpperCase();
    const db = c.env.DB;

    const accessCode = await db
      .prepare('SELECT * FROM access_codes WHERE code = ?')
      .bind(trimmedCode)
      .first<{
        code: string;
        pass_id: string | null;
        duration_days: number;
        status: string;
      }>();

    if (!accessCode || accessCode.status === 'consumed') {
      return c.json({ error: 'Invalid or already consumed Access Code' }, 400);
    }

    const now = new Date();

    // Check if caller is already logged in or passed explicit pass_id for renewal
    const existingSessionId = getCookie(c, 'session_id');
    let targetPassId: string | null = explicitPassId || null;

    if (!targetPassId && existingSessionId) {
      const activeSession = await db
        .prepare('SELECT pass_id FROM device_sessions WHERE id = ?')
        .bind(existingSessionId)
        .first<{ pass_id: string }>();
      if (activeSession) {
        targetPassId = activeSession.pass_id;
      }
    }

    // Renewal of an existing Pass using a fresh unused Access Code
    if (targetPassId && accessCode.status === 'unused') {
      const existingPass = await db
        .prepare('SELECT * FROM passes WHERE id = ?')
        .bind(targetPassId)
        .first<{ id: string; expires_at: string }>();

      if (existingPass) {
        const currentExpires = new Date(existingPass.expires_at);
        const baseTime =
          currentExpires.getTime() > now.getTime() ? currentExpires.getTime() : now.getTime();
        const newExpiresAt = new Date(
          baseTime + (accessCode.duration_days || 30) * 86400000
        );

        await db
          .prepare('UPDATE passes SET expires_at = ? WHERE id = ?')
          .bind(newExpiresAt.toISOString(), targetPassId)
          .run();

        await db
          .prepare(
            "UPDATE access_codes SET status = 'consumed', pass_id = ?, activated_at = ? WHERE code = ?"
          )
          .bind(targetPassId, now.toISOString(), trimmedCode)
          .run();

        const daysRemaining = Math.max(
          0,
          Math.ceil((newExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        );

        return c.json({
          success: true,
          pass_id: targetPassId,
          expires_at: newExpiresAt.toISOString(),
          days_remaining: daysRemaining,
        });
      }
    }

    let passId = accessCode.pass_id;
    let expiresAt: Date;

    if (!passId) {
      // First activation: mint new Pass
      passId = crypto.randomUUID();
      expiresAt = new Date(now.getTime() + (accessCode.duration_days || 30) * 86400000);

      await db
        .prepare('INSERT INTO passes (id, expires_at, created_at) VALUES (?, ?, ?)')
        .bind(passId, expiresAt.toISOString(), now.toISOString())
        .run();

      await db
        .prepare(
          "UPDATE access_codes SET status = 'active', pass_id = ?, activated_at = ? WHERE code = ?"
        )
        .bind(passId, now.toISOString(), trimmedCode)
        .run();
    } else {
      // Re-entering an active code
      const existingPass = await db
        .prepare('SELECT * FROM passes WHERE id = ?')
        .bind(passId)
        .first<{ id: string; expires_at: string }>();

      if (!existingPass) {
        return c.json({ error: 'Pass not found' }, 404);
      }
      expiresAt = new Date(existingPass.expires_at);
      if (expiresAt.getTime() < now.getTime()) {
        return c.json({ error: 'Subscription expired', expired: true, pass_id: passId }, 403);
      }
    }

    // Enforce 2 active devices limit per Pass
    // Fetch all existing sessions for this pass ordered by last_active_at ascending (oldest first)
    const existingSessions = await db
      .prepare('SELECT id FROM device_sessions WHERE pass_id = ? ORDER BY last_active_at ASC')
      .bind(passId)
      .all<{ id: string }>();

    const activeSessions = existingSessions.results || [];
    // If already at 2 or more, evict the oldest sessions to leave room for the 1 new session
    if (activeSessions.length >= 2) {
      const evictCount = activeSessions.length - 1; // leave 1 existing, add 1 new = 2 total
      const toEvict = activeSessions.slice(0, evictCount);
      for (const evict of toEvict) {
        await db.prepare('DELETE FROM device_sessions WHERE id = ?').bind(evict.id).run();
      }
    }

    // Create a device session
    const sessionId = crypto.randomUUID();
    await db
      .prepare('INSERT INTO device_sessions (id, pass_id, last_active_at) VALUES (?, ?, ?)')
      .bind(sessionId, passId, now.toISOString())
      .run();

    // Set secure HttpOnly session cookie
    setCookie(c, 'session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      path: '/',
      maxAge: 30 * 86400,
    });

    const daysRemaining = Math.max(
      0,
      Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );

    return c.json({
      success: true,
      pass_id: passId,
      expires_at: expiresAt.toISOString(),
      days_remaining: daysRemaining,
    });
  });

  // GET /api/auth/me
  app.get('/api/auth/me', async (c) => {
    const sessionId = getCookie(c, 'session_id');
    if (!sessionId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const db = c.env.DB;
    const session = await db
      .prepare(
        `SELECT s.id as session_id, p.id as pass_id, p.expires_at 
         FROM device_sessions s 
         JOIN passes p ON s.pass_id = p.id 
         WHERE s.id = ?`
      )
      .bind(sessionId)
      .first<{ session_id: string; pass_id: string; expires_at: string }>();

    if (!session) {
      deleteCookie(c, 'session_id');
      return c.json({ error: 'Session evicted by another device', evicted: true }, 401);
    }

    // Refresh last_active_at
    const now = new Date();
    await db
      .prepare('UPDATE device_sessions SET last_active_at = ? WHERE id = ?')
      .bind(now.toISOString(), sessionId)
      .run();
    const expiresAt = new Date(session.expires_at);

    if (expiresAt.getTime() < now.getTime()) {
      return c.json(
        {
          authenticated: false,
          expired: true,
          error: 'Subscription expired',
          pass_id: session.pass_id,
        },
        403
      );
    }

    const daysRemaining = Math.max(
      0,
      Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );

    return c.json({
      authenticated: true,
      pass_id: session.pass_id,
      expires_at: session.expires_at,
      days_remaining: daysRemaining,
    });
  });

  // POST /api/auth/logout
  app.post('/api/auth/logout', async (c) => {
    const sessionId = getCookie(c, 'session_id');
    if (sessionId) {
      const db = c.env.DB;
      await db.prepare('DELETE FROM device_sessions WHERE id = ?').bind(sessionId).run();
      deleteCookie(c, 'session_id');
    }
    return c.json({ success: true });
  });

  // POST /api/auth/merge
  app.post('/api/auth/merge', async (c) => {
    const sessionId = getCookie(c, 'session_id');
    if (!sessionId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const db = c.env.DB;
    const currentSession = await db
      .prepare('SELECT pass_id FROM device_sessions WHERE id = ?')
      .bind(sessionId)
      .first<{ pass_id: string }>();

    if (!currentSession) {
      return c.json({ error: 'Invalid session' }, 401);
    }

    const { old_code } = await c.req.json<{ old_code?: string }>();
    if (!old_code || typeof old_code !== 'string') {
      return c.json({ error: 'Old Access Code is required' }, 400);
    }

    const trimmedOldCode = old_code.trim().toUpperCase();
    const oldAccessCode = await db
      .prepare('SELECT pass_id FROM access_codes WHERE code = ?')
      .bind(trimmedOldCode)
      .first<{ pass_id: string | null }>();

    if (!oldAccessCode || !oldAccessCode.pass_id) {
      return c.json({ error: 'Old Access Code not found or has no history' }, 404);
    }

    const oldPassId = oldAccessCode.pass_id;
    if (oldPassId === currentSession.pass_id) {
      return c.json({ error: 'Cannot merge code belonging to the same Pass' }, 400);
    }

    // Transfer bookmarks from old Pass into current Pass
    await db
      .prepare(
        'INSERT OR IGNORE INTO bookmarks (pass_id, media_id, created_at) SELECT ?, media_id, created_at FROM bookmarks WHERE pass_id = ?'
      )
      .bind(currentSession.pass_id, oldPassId)
      .run();

    return c.json({ success: true, message: 'Historical bookmarks merged successfully' });
  });

  // Helper to authenticate requests
  async function requireAuth(c: any) {
    const sessionId = getCookie(c, 'session_id');
    if (!sessionId) return null;
    const db = c.env.DB as D1Database;
    const session = await db
      .prepare(
        `SELECT s.id as session_id, p.id as pass_id, p.expires_at 
         FROM device_sessions s 
         JOIN passes p ON s.pass_id = p.id 
         WHERE s.id = ?`
      )
      .bind(sessionId)
      .first<{ session_id: string; pass_id: string; expires_at: string }>();

    if (!session) return null;
    if (new Date(session.expires_at).getTime() < Date.now()) return null;
    return session;
  }

  // GET /api/creators
  app.get('/api/creators', async (c) => {
    const auth = await requireAuth(c);
    if (!auth) return c.json({ error: 'Unauthorized' }, 401);

    const q = c.req.query('q');
    const db = c.env.DB;
    let query = 'SELECT id, handle, media_count FROM creators';
    const params: any[] = [];
    if (q) {
      query += ' WHERE handle LIKE ?';
      params.push(`%${q}%`);
    }
    query += ' ORDER BY media_count DESC, handle ASC';

    const rows = await db.prepare(query).bind(...params).all<{
      id: string;
      handle: string;
      media_count: number;
    }>();

    return c.json({ creators: rows.results || [] });
  });

  // GET /api/media
  app.get('/api/media', async (c) => {
    const auth = await requireAuth(c);
    if (!auth) return c.json({ error: 'Unauthorized' }, 401);

    const creatorId = c.req.query('creator_id');
    const mediaType = c.req.query('media_type');
    const cursor = c.req.query('cursor');
    const bookmarkedOnly = c.req.query('bookmarked_only') === 'true';
    const limit = Math.min(Number(c.req.query('limit')) || 20, 100);

    const db = c.env.DB;
    const conditions: string[] = [];
    const params: any[] = [];

    if (bookmarkedOnly) {
      conditions.push('m.id IN (SELECT media_id FROM bookmarks WHERE pass_id = ?)');
      params.push(auth.pass_id);
    }

    if (creatorId) {
      conditions.push('m.creator_id = ?');
      params.push(creatorId);
    }

    if (mediaType && (mediaType === 'image' || mediaType === 'video')) {
      conditions.push('m.media_type = ?');
      params.push(mediaType);
    }

    if (cursor) {
      conditions.push('m.published_at < ?');
      params.push(cursor);
    }

    let query = `
      SELECT m.*, c.handle as creator_handle,
        EXISTS(SELECT 1 FROM bookmarks b WHERE b.pass_id = ? AND b.media_id = m.id) as is_bookmarked
      FROM media m
      JOIN creators c ON m.creator_id = c.id
    `;
    const queryParams: any[] = [auth.pass_id, ...params];

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY m.published_at DESC LIMIT ?';
    queryParams.push(limit + 1);

    const rows = await db.prepare(query).bind(...queryParams).all<any>();
    const results = rows.results || [];
    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, limit) : results;
    const nextCursor = hasMore ? items[items.length - 1].published_at : null;

    return c.json({
      items: items.map((item) => ({ ...item, is_bookmarked: Boolean(item.is_bookmarked) })),
      next_cursor: nextCursor,
    });
  });

  // GET /api/stream/:id (Authenticated R2 Streaming Proxy with HTTP Range)
  app.get('/api/stream/:id', async (c) => {
    const auth = await requireAuth(c);
    if (!auth) return c.json({ error: 'Unauthorized' }, 401);

    const id = c.req.param('id');
    const db = c.env.DB as D1Database;
    const media = await db
      .prepare('SELECT r2_key, media_type FROM media WHERE id = ?')
      .bind(id)
      .first<{ r2_key: string; media_type: string }>();

    if (!media || !c.env.BUCKET) {
      return c.json({ error: 'Media not found' }, 404);
    }

    const rangeHeader = c.req.header('range');
    const r2Options: R2GetOptions = {};

    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        const offset = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : undefined;
        const length = end !== undefined ? end - offset + 1 : undefined;
        r2Options.range = { offset, length };
      }
    }

    const object = await c.env.BUCKET.get(media.r2_key, r2Options);
    if (!object) {
      return c.json({ error: 'Object not found in storage' }, 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'private, max-age=604800');

    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', media.media_type === 'video' ? 'video/mp4' : 'image/jpeg');
    }

    if (object.range) {
      const range = object.range;
      const offset = 'offset' in range && range.offset !== undefined ? range.offset : 0;
      const length =
        'length' in range && range.length !== undefined
          ? range.length
          : object.size - offset;
      const end = offset + length - 1;
      headers.set('Content-Range', `bytes ${offset}-${end}/${object.size}`);
      headers.set('Content-Length', length.toString());
      return new Response(object.body as any, { status: 206, headers });
    }

    headers.set('Content-Length', object.size.toString());
    return new Response(object.body as any, { status: 200, headers });
  });

  // GET /api/posters/:id (Authenticated WebP Poster Proxy)
  app.get('/api/posters/:id', async (c) => {
    const auth = await requireAuth(c);
    if (!auth) return c.json({ error: 'Unauthorized' }, 401);

    const id = c.req.param('id');
    const db = c.env.DB as D1Database;
    const media = await db
      .prepare('SELECT poster_key, r2_key, media_type FROM media WHERE id = ?')
      .bind(id)
      .first<{ poster_key: string | null; r2_key: string; media_type: string }>();

    if (!media || !c.env.BUCKET) {
      return c.json({ error: 'Media not found' }, 404);
    }

    const key = media.poster_key || media.r2_key;
    const object = await c.env.BUCKET.get(key);
    if (!object) {
      return c.json({ error: 'Poster not found in storage' }, 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'private, max-age=604800');

    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', media.poster_key ? 'image/webp' : 'image/jpeg');
    }

    headers.set('Content-Length', object.size.toString());
    return new Response(object.body as any, { status: 200, headers });
  });

  // POST /api/media/:id/bookmark
  app.post('/api/media/:id/bookmark', async (c) => {
    const auth = await requireAuth(c);
    if (!auth) return c.json({ error: 'Unauthorized' }, 401);

    const mediaId = c.req.param('id');
    const db = c.env.DB as D1Database;

    const existing = await db
      .prepare('SELECT 1 FROM bookmarks WHERE pass_id = ? AND media_id = ?')
      .bind(auth.pass_id, mediaId)
      .first();

    if (existing) {
      await db
        .prepare('DELETE FROM bookmarks WHERE pass_id = ? AND media_id = ?')
        .bind(auth.pass_id, mediaId)
        .run();
      return c.json({ success: true, bookmarked: false });
    } else {
      await db
        .prepare('INSERT INTO bookmarks (pass_id, media_id) VALUES (?, ?)')
        .bind(auth.pass_id, mediaId)
        .run();
      return c.json({ success: true, bookmarked: true });
    }
  });

  // Internal endpoints for local ingestion or authenticated admin migration
  app.put('/api/internal/r2/*', async (c) => {
    const token = c.req.header('x-internal-token');
    const expectedToken = c.env.INTERNAL_TOKEN || 'cutie-dev-secret';
    if (token !== expectedToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    if (!c.env.BUCKET) {
      return c.json({ error: 'Bucket not configured' }, 500);
    }

    const key = c.req.path.replace(/^\/api\/internal\/r2\//, '');
    const decodedKey = decodeURIComponent(key);
    const contentType = c.req.header('content-type') || 'application/octet-stream';
    const body = await c.req.arrayBuffer();

    await c.env.BUCKET.put(decodedKey, body, {
      httpMetadata: { contentType },
    });

    return c.json({ success: true, key: decodedKey });
  });

  app.post('/api/internal/batch-media', async (c) => {
    const token = c.req.header('x-internal-token');
    const expectedToken = c.env.INTERNAL_TOKEN || 'cutie-dev-secret';
    if (token !== expectedToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { creators, media } = await c.req.json<{
      creators?: Array<{ id: string; handle: string; media_count: number }>;
      media?: Array<{
        id: string;
        creator_id: string;
        media_type: string;
        r2_key: string;
        poster_key: string | null;
        published_at: string;
        width: number;
        height: number;
      }>;
    }>();

    const db = c.env.DB as D1Database;

    if (creators && creators.length > 0) {
      for (const cr of creators) {
        await db
          .prepare(
            'INSERT INTO creators (id, handle, media_count) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET media_count = excluded.media_count'
          )
          .bind(cr.id, cr.handle, cr.media_count)
          .run();
      }
    }

    if (media && media.length > 0) {
      for (const m of media) {
        await db
          .prepare(
            'INSERT OR REPLACE INTO media (id, creator_id, media_type, r2_key, poster_key, published_at, width, height) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
          )
          .bind(
            m.id,
            m.creator_id,
            m.media_type,
            m.r2_key,
            m.poster_key,
            m.published_at,
            m.width,
            m.height
          )
          .run();
      }
    }

    return c.json({ success: true, count: media?.length || 0 });
  });

  return app;
}
