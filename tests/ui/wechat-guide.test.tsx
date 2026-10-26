import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../../src/client/App';

describe('UI Seam: WeChat In-App Browser Guide', () => {
  const originalUserAgent = navigator.userAgent;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true,
    });
  });

  it('renders WeChat guidance overlay when opened inside WeChat MicroMessenger', async () => {
    // Mock WeChat User Agent on iOS iPhone
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.38(0x1800262c) NetType/WIFI Language/zh_CN',
      configurable: true,
    });

    render(<App />);

    // WeChat overlay elements should be displayed
    expect(screen.getByTestId('wechat-guide-overlay')).toBeInTheDocument();
    expect(screen.getByText(/请在手机系统浏览器中打开/i)).toBeInTheDocument();
    expect(screen.getAllByText(/点击右上角/i)).toHaveLength(2);
    expect(screen.getByText(/在 Safari 中打开/i)).toBeInTheDocument();

    // Clicking copy link
    const copyBtn = screen.getByRole('button', { name: /复制网址/i });
    expect(copyBtn).toBeInTheDocument();
    fireEvent.click(copyBtn);
    expect(await screen.findByText(/去浏览器粘贴打开/i)).toBeInTheDocument();

    // Clicking bypass button dismisses the overlay
    const bypassBtn = screen.getByText(/暂且在微信内继续访问/i);
    fireEvent.click(bypassBtn);

    // Overlay is dismissed
    expect(screen.queryByTestId('wechat-guide-overlay')).not.toBeInTheDocument();
  });

  it('adapts guidance text to "在浏览器中打开" on Android WeChat', () => {
    // Mock WeChat User Agent on Android
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 13; SM-S908U) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/111.0.5563.116 Mobile Safari/537.36 MicroMessenger/8.0.35.2360(0x28002351) Process/toolsmp WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64',
      configurable: true,
    });

    render(<App />);

    expect(screen.getByTestId('wechat-guide-overlay')).toBeInTheDocument();
    expect(screen.getByText(/在浏览器中打开/i)).toBeInTheDocument();
  });
});
