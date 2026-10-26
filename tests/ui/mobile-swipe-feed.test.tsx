import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileVerticalFeed } from '../../src/client/components/MobileVerticalFeed';
import type { MediaAsset } from '../../src/client/types';

describe('UI Seam: Mobile Vertical Swipe Feed', () => {
  const sampleMedia: MediaAsset[] = [
    {
      id: 'm-1',
      creator_id: 'c-1',
      creator_handle: 'alice_creator',
      media_type: 'image',
      r2_key: 'media/alice/1.jpg',
      poster_key: null,
      published_at: '2026-10-25 10:00:00',
      width: 1080,
      height: 1080,
      is_bookmarked: false,
    },
    {
      id: 'm-2',
      creator_id: 'c-2',
      creator_handle: 'bob_creator',
      media_type: 'video',
      r2_key: 'media/bob/1.mp4',
      poster_key: 'posters/bob/1.webp',
      published_at: '2026-10-24 10:00:00',
      width: 1080,
      height: 1920,
      is_bookmarked: true,
    },
  ];

  beforeEach(() => {
    // Mock IntersectionObserver as a class constructor
    class MockObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
    window.IntersectionObserver = MockObserver as any;
  });

  it('renders snap-y scroll container with media items and back button', () => {
    const handleClose = vi.fn();
    render(
      <MobileVerticalFeed
        initialIndex={0}
        mediaList={sampleMedia}
        onClose={handleClose}
      />
    );

    expect(screen.getByText('alice_creator')).toBeInTheDocument();
    expect(screen.getByText('bob_creator')).toBeInTheDocument();

    // Verify back button closes
    const backBtn = screen.getByTitle(/返回/i);
    fireEvent.click(backBtn);
    expect(handleClose).toHaveBeenCalled();
  });

  it('toggles audio mute state when mute button is tapped', () => {
    render(
      <MobileVerticalFeed
        initialIndex={1}
        mediaList={sampleMedia}
        onClose={vi.fn()}
      />
    );

    // Initial state is muted, so title is "取消静音"
    const unmuteBtn = screen.getByTitle(/取消静音/i);
    fireEvent.click(unmuteBtn);

    // Now unmuted, so title is "静音"
    expect(screen.getByTitle(/^静音$/i)).toBeInTheDocument();
  });
});
