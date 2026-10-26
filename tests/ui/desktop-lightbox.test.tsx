import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DesktopLightbox } from '../../src/client/components/DesktopLightbox';
import type { MediaAsset } from '../../src/client/types';

describe('UI Seam: Desktop Lightbox & Keyboard Navigation', () => {
  const sampleMedia: MediaAsset[] = [
    {
      id: 'm-1',
      creator_id: 'c-1',
      creator_handle: 'creator_one',
      media_type: 'image',
      r2_key: 'media/1.jpg',
      poster_key: null,
      published_at: '2026-10-25 12:00:00',
      width: 1080,
      height: 1080,
      is_bookmarked: false,
    },
    {
      id: 'm-2',
      creator_id: 'c-2',
      creator_handle: 'creator_two',
      media_type: 'video',
      r2_key: 'media/2.mp4',
      poster_key: 'posters/2.webp',
      published_at: '2026-10-24 12:00:00',
      width: 1080,
      height: 1920,
      is_bookmarked: true,
    },
  ];

  it('renders image in lightbox and supports ArrowRight/ArrowLeft and Escape keys', () => {
    const handleClose = vi.fn();
    const handleSelect = vi.fn();

    const { rerender } = render(
      <DesktopLightbox
        media={sampleMedia[0]}
        mediaList={sampleMedia}
        onClose={handleClose}
        onSelectMedia={handleSelect}
      />
    );

    expect(screen.getByText('creator_one')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/api/stream/m-1');

    // Press ArrowRight -> should request next media (m-2)
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(handleSelect).toHaveBeenCalledWith(sampleMedia[1]);

    // Rerender with m-2 (video)
    rerender(
      <DesktopLightbox
        media={sampleMedia[1]}
        mediaList={sampleMedia}
        onClose={handleClose}
        onSelectMedia={handleSelect}
      />
    );

    expect(screen.getByText('creator_two')).toBeInTheDocument();

    // Press ArrowLeft -> should request previous media (m-0)
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(handleSelect).toHaveBeenCalledWith(sampleMedia[0]);

    // Press Escape -> should close
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Click backdrop area -> should close
    const backdrop = screen.getByTestId('lightbox-backdrop');
    fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(2);

    // Click media area -> should NOT trigger handleClose
    const mediaElement = backdrop.querySelector('video') || backdrop.querySelector('img');
    if (mediaElement) {
      fireEvent.click(mediaElement);
      expect(handleClose).toHaveBeenCalledTimes(2);
    }
  });
});
