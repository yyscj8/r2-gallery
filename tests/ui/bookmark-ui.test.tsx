import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../../src/client/App';

describe('UI Seam: Bookmark UI & Toggle', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('optimistically toggles bookmark heart and calls POST /api/media/:id/bookmark', async () => {
    let bookmarkCalledWith: string | null = null;

    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === '/api/auth/me') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              authenticated: true,
              days_remaining: 30,
              pass_id: 'test-pass',
            }),
        });
      }

      if (url === '/api/creators') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ creators: [] }),
        });
      }

      if (url.startsWith('/api/media') && !url.includes('/bookmark')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              items: [
                {
                  id: 'item-1',
                  creator_id: 'c-1',
                  creator_handle: 'test_creator',
                  media_type: 'image',
                  r2_key: 'media/test.jpg',
                  poster_key: null,
                  published_at: '2026-10-25 10:00:00',
                  width: 1080,
                  height: 1080,
                  is_bookmarked: false,
                },
              ],
              next_cursor: null,
            }),
        });
      }

      if (url === '/api/media/item-1/bookmark') {
        bookmarkCalledWith = 'item-1';
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, bookmarked: true }),
        });
      }

      return Promise.reject(new Error(`Unknown url: ${url}`));
    });

    render(<App />);

    // Wait for card to appear
    const heartBtn = await screen.findByTitle(/加入收藏/i);
    expect(heartBtn).toBeInTheDocument();

    // Click heart to bookmark
    fireEvent.click(heartBtn);

    expect(bookmarkCalledWith).toBe('item-1');
  });
});
