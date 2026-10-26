import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../../src/client/App';

describe('UI Seam: Session Eviction Notification', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('displays a friendly notification when the device session was evicted by another device', async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === '/api/auth/me') {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () =>
            Promise.resolve({
              error: 'Session evicted by another device',
              evicted: true,
            }),
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    render(<App />);

    expect(
      await screen.findByText(/该通行证已在其他设备登录/i)
    ).toBeInTheDocument();
  });
});
