import React from 'react';
import { Play, Heart, Film } from 'lucide-react';
import type { MediaAsset } from '../types';

interface MediaCardProps {
  media: MediaAsset;
  onSelect: (media: MediaAsset) => void;
  onToggleBookmark?: (mediaId: string, current: boolean) => void;
}

export function MediaCard({ media, onSelect, onToggleBookmark }: MediaCardProps) {
  const isVideo = media.media_type === 'video';
  // If video, use poster proxy; if image, use stream proxy
  const imgSrc = isVideo && media.poster_key
    ? `/api/posters/${media.id}`
    : `/api/stream/${media.id}`;

  return (
    <div
      onClick={() => onSelect(media)}
      className="group relative cursor-pointer overflow-hidden rounded-2xl bg-zinc-50 border border-zinc-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
    >
      {/* Media Image / Video Poster */}
      <div className="relative aspect-3/4 w-full overflow-hidden bg-zinc-100">
        <img
          src={imgSrc}
          alt={media.creator_handle}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Video Type Indicator Badge */}
        {isVideo && (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-xs">
            <Film className="h-3 w-3" />
            <span>视频</span>
          </div>
        )}

        {/* Bookmark Heart Button */}
        {onToggleBookmark && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleBookmark(media.id, media.is_bookmarked);
            }}
            className="absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xs transition-transform active:scale-90 hover:bg-black/60"
            title={media.is_bookmarked ? '取消收藏' : '加入收藏'}
          >
            <Heart
              className={`h-4 w-4 transition-colors ${
                media.is_bookmarked ? 'fill-rose-500 text-rose-500' : 'text-white'
              }`}
            />
          </button>
        )}

        {/* Hover info overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-between">
          <span className="truncate text-xs font-semibold">
            {media.creator_handle}
          </span>
          <span className="text-[10px] text-zinc-300 shrink-0">
            {media.published_at.slice(0, 10)}
          </span>
        </div>
      </div>
    </div>
  );
}
