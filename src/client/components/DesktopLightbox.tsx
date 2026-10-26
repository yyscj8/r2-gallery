import React, { useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, Calendar } from 'lucide-react';
import type { MediaAsset } from '../types';

interface DesktopLightboxProps {
  media: MediaAsset | null;
  mediaList: MediaAsset[];
  onClose: () => void;
  onSelectMedia: (media: MediaAsset) => void;
  onToggleBookmark?: (mediaId: string, current: boolean) => void;
}

export function DesktopLightbox({
  media,
  mediaList,
  onClose,
  onSelectMedia,
  onToggleBookmark,
}: DesktopLightboxProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentIndex = media
    ? mediaList.findIndex((item) => item.id === media.id)
    : -1;

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < mediaList.length - 1;

  const goToPrev = () => {
    if (hasPrev) onSelectMedia(mediaList[currentIndex - 1]);
  };

  const goToNext = () => {
    if (hasNext) onSelectMedia(mediaList[currentIndex + 1]);
  };

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      } else if (e.key === ' ' && videoRef.current) {
        e.preventDefault();
        if (videoRef.current.paused) {
          videoRef.current.play();
        } else {
          videoRef.current.pause();
        }
      } else if ((e.key === 'f' || e.key === 'F') && media && onToggleBookmark) {
        e.preventDefault();
        onToggleBookmark(media.id, media.is_bookmarked);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, media, mediaList, onClose, onSelectMedia, onToggleBookmark]);

  if (!media) return null;

  const isVideo = media.media_type === 'video';

  return (
    <div
      data-testid="lightbox-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md cursor-zoom-out select-none"
    >
      {/* Top Header Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute top-0 inset-x-0 z-20 flex h-16 items-center justify-between px-6 bg-gradient-to-b from-black/80 to-transparent text-white cursor-default"
      >
        <div className="flex items-center gap-3">
          <span className="text-base font-semibold tracking-tight">
            {media.creator_handle}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
            <Calendar className="h-3.5 w-3.5" />
            {media.published_at.slice(0, 10)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {onToggleBookmark && (
            <button
              onClick={() => onToggleBookmark(media.id, media.is_bookmarked)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
              title={media.is_bookmarked ? '取消收藏 (快捷键 F)' : '加入收藏 (快捷键 F)'}
            >
              <Heart
                className={`h-5 w-5 ${
                  media.is_bookmarked ? 'fill-rose-500 text-rose-500' : 'text-white'
                }`}
              />
            </button>
          )}

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            title="关闭 (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Navigation Buttons */}
      {hasPrev && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToPrev();
          }}
          className="absolute left-6 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs transition-all cursor-pointer"
          title="上一个 (←)"
        >
          <ChevronLeft className="h-7 w-7" />
        </button>
      )}

      {hasNext && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToNext();
          }}
          className="absolute right-6 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs transition-all cursor-pointer"
          title="下一个 (→)"
        >
          <ChevronRight className="h-7 w-7" />
        </button>
      )}

      {/* Media Viewer Area */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[88vh] max-w-[92vw] items-center justify-center p-2 cursor-default"
      >
        {isVideo ? (
          <video
            ref={videoRef}
            src={`/api/stream/${media.id}`}
            poster={media.poster_key ? `/api/posters/${media.id}` : undefined}
            controls
            autoPlay
            playsInline
            className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
          />
        ) : (
          <img
            src={`/api/stream/${media.id}`}
            alt={media.creator_handle}
            className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
          />
        )}
      </div>

      {/* Bottom Counter */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-4 inset-x-0 flex justify-center text-xs font-medium text-zinc-400 cursor-default"
      >
        {currentIndex + 1} / {mediaList.length}
      </div>
    </div>
  );
}
