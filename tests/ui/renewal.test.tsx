import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../../src/client/App';

describe('UI Seam: Renewal & Historical Merge', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders expiration prompt with renewal input when pass has expired, and restores on renewal', async () => {
    let renewed = false;
    global.fetch = vi.fn().mockImplementation((url, init) => {
      if (url === '/api/auth/me') {
        if (!renewed) {
          return Promise.resolve({
            ok: false,
            status: 403,
            json: () =>
              Promise.resolve({
                error: 'Subscription expired',
                expired: true,
                pass_id: 'expired-pass-1',
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              authenticated: true,
              days_remaining: 30,
              pass_id: 'expired-pass-1',
            }),
        });
      }

      if (url === '/api/auth/redeem') {
        const body = JSON.parse(init.body);
        if (body.code === 'NEW-RENEW-KEY') {
          renewed = true;
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                success: true,
                days_remaining: 30,
                pass_id: 'expired-pass-1',
              }),
          });
        }
      }

      return Promise.reject(new Error('Unknown url'));
    });

    render(<App />);

    expect(await screen.findByText(/通行证已到期/i)).toBeInTheDocument();
    const renewalInput = screen.getByPlaceholderText(/输入续费卡密/i);
    const renewBtn = screen.getByRole('button', { name: /立即续费/i });

    fireEvent.change(renewalInput, { target: { value: 'NEW-RENEW-KEY' } });
    fireEvent.click(renewBtn);

    await waitFor(() => {
      expect(screen.getByText(/30 天/i)).toBeInTheDocument();
    });
  });
});
