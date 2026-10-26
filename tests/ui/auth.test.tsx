import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../../src/client/App';

describe('UI Seam: Authentication & Shell', () => {
  beforeEach(() => {
    // Reset fetch mock
    vi.restoreAllMocks();
    window.location.hash = '';
  });

  it('renders landing page with single Access Code input in white theme when unauthenticated', async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === '/api/auth/me') {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: 'Unauthorized' }),
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    render(<App />);

    expect(await screen.findByPlaceholderText(/输入访问卡密/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /进入/i })).toBeInTheDocument();
  });

  it('submits Access Code, authenticates successfully and renders shell with days remaining', async () => {
    global.fetch = vi.fn().mockImplementation((url, init) => {
      if (url === '/api/auth/me') {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: 'Unauthorized' }),
        });
      }
      if (url === '/api/auth/redeem') {
        const body = JSON.parse(init.body);
        if (body.code === 'VALID-CODE') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                success: true,
                days_remaining: 30,
                expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
              }),
          });
        }
      }
      return Promise.resolve({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: '无效的卡密' }),
      });
    });

    render(<App />);

    const input = await screen.findByPlaceholderText(/输入访问卡密/i);
    const enterBtn = screen.getByRole('button', { name: /进入/i });

    fireEvent.change(input, { target: { value: 'VALID-CODE' } });
    fireEvent.click(enterBtn);

    await waitFor(() => {
      expect(screen.getByText(/30 天/i)).toBeInTheDocument();
    });
  });

  it('automatically redeems #key=... from URL hash, cleans hash, and logs in', async () => {
    window.location.hash = '#key=AUTO-HASH-CODE';

    let redeemed = false;
    global.fetch = vi.fn().mockImplementation((url, init) => {
      if (url === '/api/auth/me' && !redeemed) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: 'Unauthorized' }),
        });
      }
      if (url === '/api/auth/redeem') {
        const body = JSON.parse(init.body);
        if (body.code === 'AUTO-HASH-CODE') {
          redeemed = true;
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                success: true,
                days_remaining: 30,
                expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
              }),
          });
        }
      }
      return Promise.resolve({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Invalid' }),
      });
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/30 天/i)).toBeInTheDocument();
    });

    // Hash should be cleared from URL
    expect(window.location.hash).toBe('');
  });
});
