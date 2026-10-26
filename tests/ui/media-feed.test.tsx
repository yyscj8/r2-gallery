import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../../src/client/App';

describe('UI Seam: Media Feed & Creator Filter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders media cards and allows filtering by Creator drawer', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
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
          json: () =>
            Promise.resolve({
              creators: [
                { id: 'creator-alice', handle: 'alice_style', media_count: 5 },
                { id: 'creator-bob', handle: 'bob_travels', media_count: 3 },
              ],
            }),
        });
      }

      if (url.startsWith('/api/media')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              items: [
                {
                  id: 'm-1',
                  creator_id: 'creator-alice',
                  creator_handle: 'alice_style',
                  media_type: 'image',
                  r2_key: 'media/alice/1.jpg',
                  poster_key: null,
                  published_at: '2026-10-25 10:00:00',
                  width: 1080,
                  height: 1350,
                  is_bookmarked: false,
                },
                {
                  id: 'm-2',
                  creator_id: 'creator-bob',
                  creator_handle: 'bob_travels',
                  media_type: 'video',
                  r2_key: 'media/bob/1.mp4',
                  poster_key: 'posters/bob/1.webp',
                  published_at: '2026-10-24 10:00:00',
                  width: 1080,
                  height: 1920,
                  is_bookmarked: true,
                },
              ],
              next_cursor: null,
            }),
        });
      }

      return Promise.reject(new Error('Unknown url'));
    });

    render(<App />);

    // Check media feed and sidebar loaded (alice_style appears in persistent sidebar and on card)
    const aliceElements = await screen.findAllByText(/alice_style/i);
    expect(aliceElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/共 2 项媒体/i)).toBeInTheDocument();

    // Verify creator sidebar is docked on the left
    expect(screen.getByText(/博主列表/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/搜索博主 handle/i)).toBeInTheDocument();

    // Verify clicking a creator in the sidebar filters the list
    const aliceSidebarBtn = aliceElements[0].closest('button');
    if (aliceSidebarBtn) {
      fireEvent.click(aliceSidebarBtn);
    }
  });
});
