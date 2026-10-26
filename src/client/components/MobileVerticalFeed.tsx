import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Volume2, VolumeX, Heart, Calendar } from 'lucide-react';
import type { MediaAsset } from '../types';

interface MobileVerticalFeedProps {
  initialIndex: number;
  mediaList: MediaAsset[];
  onClose: () => void;
  onToggleBookmark?: (mediaId: string, current: boolean) => void;
}

export function MobileVerticalFeed({
  initialIndex,
  mediaList,
  onClose,
  onToggleBookmark,
}: MobileVerticalFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  // Scroll to initial index on mount
  useEffect(() => {
    if (
      containerRef.current &&
      initialIndex > 0 &&
      typeof containerRef.current.scrollTo === 'function'
    ) {
      const targetY = initialIndex * window.innerHeight;
      containerRef.current.scrollTo({ top: targetY, behavior: 'instant' });
    }
  }, [initialIndex]);

  // Set up IntersectionObserver to autoplay the video that is currently visible
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = container.querySelectorAll<HTMLElement>('[data-feed-item]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = Number(entry.target.getAttribute('data-index'));
          const video = entry.target.querySelector('video');

          if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
            setActiveIndex(index);
            if (video) {
              video.play().catch(() => {});
            }
          } else {
            if (video) {
              video.pause();
              video.currentTime = 0;
            }
          }
        });
      },
      {
        root: container,
        threshold: 0.75,
      }
    );

    items.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, [mediaList]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black text-white overflow-y-scroll snap-y snap-mandatory select-none scroll-smooth"
    >
      {/* Top Floating Action Bar */}
      <div
        className={`fixed top-0 inset-x-0 z-30 flex h-14 items-center justify-between px-4 bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xs active:scale-95"
          title="返回"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <button
          onClick={() => setIsMuted(!isMuted)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xs active:scale-95"
          title={isMuted ? '取消静音' : '静音'}
        >
          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      </div>

      {/* Media Feed Items */}
      {mediaList.map((media, index) => {
        const isVideo = media.media_type === 'video';

        return (
          <div
            key={media.id}
            data-feed-item
            data-index={index}
            onClick={() => setShowControls(!showControls)}
            className="relative h-[100dvh] w-full snap-start snap-always flex items-center justify-center overflow-hidden bg-black"
          >
            {isVideo ? (
              <video
                src={`/api/stream/${media.id}`}
                poster={media.poster_key ? `/api/posters/${media.id}` : undefined}
                loop
                playsInline
                muted={isMuted}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <img
                src={`/api/stream/${media.id}`}
                alt={media.creator_handle}
                className="max-h-full max-w-full object-contain"
              />
            )}

            {/* Bottom/Right Floating Overlay Info */}
            <div
              className={`absolute inset-x-0 bottom-0 z-20 flex items-end justify-between p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300 ${
                showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              {/* Creator info */}
              <div className="space-y-1 max-w-[70%]">
                <span className="text-base font-bold tracking-tight text-white drop-shadow-md">
                  {media.creator_handle}
                </span>
                <div className="flex items-center gap-1.5 text-xs text-zinc-300 drop-shadow-xs">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{media.published_at.slice(0, 10)}</span>
                </div>
              </div>

              {/* Bookmark Button */}
              {onToggleBookmark && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleBookmark(media.id, media.is_bookmarked);
                  }}
                  className="flex h-12 w-12 flex-col items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xs active:scale-90"
                  title={media.is_bookmarked ? '取消收藏' : '加入收藏'}
                >
                  <Heart
                    className={`h-6 w-6 transition-colors ${
                      media.is_bookmarked ? 'fill-rose-500 text-rose-500' : 'text-white'
                    }`}
                  />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
