import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Users, Filter, Image, Film, Heart, Loader2, X } from 'lucide-react';
import { MediaCard } from './MediaCard';
import { CreatorDrawer } from './CreatorDrawer';
import { CreatorSidebar } from './CreatorSidebar';
import type { Creator, MediaAsset } from '../types';

interface MediaFeedProps {
  onSelectMedia: (media: MediaAsset, list: MediaAsset[]) => void;
  onToggleBookmark?: (mediaId: string, current: boolean) => void;
}

export function MediaFeed({ onSelectMedia, onToggleBookmark }: MediaFeedProps) {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'all' | 'image' | 'video'>('all');
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);

  const [items, setItems] = useState<MediaAsset[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Load creators once
  useEffect(() => {
    fetch('/api/creators')
      .then((res) => (res.ok ? (res.json() as Promise<{ creators: Creator[] }>) : Promise.reject()))
      .then((data) => setCreators(data.creators || []))
      .catch(() => {});
  }, []);

  // Fetch media function
  const fetchMedia = useCallback(
    async (isInitial = true, nextCursor: string | null = null) => {
      if (isInitial) setLoading(true);
      else setLoadingMore(true);

      const params = new URLSearchParams();
      if (selectedCreatorId) params.set('creator_id', selectedCreatorId);
      if (mediaType !== 'all') params.set('media_type', mediaType);
      if (bookmarkedOnly) params.set('bookmarked_only', 'true');
      if (nextCursor) params.set('cursor', nextCursor);
      params.set('limit', '20');

      try {
        const res = await fetch(`/api/media?${params.toString()}`);
        if (res.ok) {
          const data = (await res.json()) as { items: MediaAsset[]; next_cursor: string | null };
          if (isInitial) {
            setItems(data.items);
          } else {
            setItems((prev) => [...prev, ...data.items]);
          }
          setCursor(data.next_cursor);
          setHasMore(Boolean(data.next_cursor));
        }
      } catch {
        // Handle error
      } finally {
        if (isInitial) setLoading(false);
        else setLoadingMore(false);
      }
    },
    [selectedCreatorId, mediaType, bookmarkedOnly]
  );

  const handleCardBookmark = (mediaId: string, current: boolean) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === mediaId ? { ...item, is_bookmarked: !current } : item
      )
    );
    if (onToggleBookmark) {
      onToggleBookmark(mediaId, current);
    }
  };

  // Re-fetch on filter change
  useEffect(() => {
    fetchMedia(true, null);
  }, [fetchMedia]);

  const sentinelRef = useRef<HTMLDivElement>(null);

  // Automatic Infinite Scroll when scrolling near bottom
  useEffect(() => {
    if (!hasMore || loading || loadingMore || !cursor) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchMedia(false, cursor);
        }
      },
      { rootMargin: '400px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, cursor, fetchMedia]);

  const selectedCreator = creators.find((c) => c.id === selectedCreatorId);

  return (
    <div className="flex flex-1 w-full min-h-[calc(100vh-4rem)]">
      {/* Desktop Persistent Left Sidebar */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 border-r border-zinc-100 bg-white sticky top-16 h-[calc(100vh-4rem)] shrink-0 z-20">
        <CreatorSidebar
          creators={creators}
          selectedCreatorId={selectedCreatorId}
          onSelectCreator={setSelectedCreatorId}
        />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl">
        {/* Filter and Control Bar */}
        <div className="sticky top-16 z-10 mb-6 flex flex-wrap items-center justify-between gap-3 bg-white/90 py-3 backdrop-blur-md border-b border-zinc-100">
          <div className="flex flex-wrap items-center gap-2">
            {/* Mobile Creator Drawer Button */}
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="移动端博主筛选"
              className={`md:hidden inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                selectedCreatorId
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>{selectedCreator ? selectedCreator.handle : '全部博主'}</span>
            </button>

            {/* Desktop Active Creator Filter Chip */}
            {selectedCreator && (
              <div className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-zinc-900 text-white pl-3 pr-2 py-1 text-xs font-medium shadow-xs">
                <span>{selectedCreator.handle}</span>
                <button
                  onClick={() => setSelectedCreatorId(null)}
                  className="rounded-full p-0.5 hover:bg-zinc-700 transition-colors"
                  title="清除博主筛选"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Type Filter Pills */}
            <div className="inline-flex rounded-full bg-zinc-100 p-0.5">
              <button
                onClick={() => setMediaType('all')}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  mediaType === 'all'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                全部
              </button>
              <button
                onClick={() => setMediaType('image')}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  mediaType === 'image'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Image className="h-3 w-3" />
                <span>图片</span>
              </button>
              <button
                onClick={() => setMediaType('video')}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  mediaType === 'video'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Film className="h-3 w-3" />
                <span>视频</span>
              </button>
            </div>

            {/* Bookmarks Toggle */}
            <button
              onClick={() => setBookmarkedOnly(!bookmarkedOnly)}
              className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                bookmarkedOnly
                  ? 'bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-500/20 shadow-xs'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              <Heart
                className={`h-3.5 w-3.5 ${
                  bookmarkedOnly ? 'fill-rose-500 text-rose-500' : 'text-zinc-500'
                }`}
              />
              <span>我的收藏</span>
            </button>
          </div>

          {/* Total counts badge */}
          <div className="text-xs text-zinc-400">
            共 {items.length} 项媒体
          </div>
        </div>

        {/* Media Waterfall Grid */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-50 border border-zinc-100 text-zinc-400 mb-3">
              <Filter className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-800">未找到符合条件的媒体</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs">
              当前筛选条件下暂无图片或视频，请尝试切换博主或过滤器。
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {items.map((item) => (
                <MediaCard
                  key={item.id}
                  media={item}
                  onSelect={(media) => onSelectMedia(media, items)}
                  onToggleBookmark={handleCardBookmark}
                />
              ))}
            </div>

            {/* Infinite Scroll Sentinel & Automatic Loading Indicator */}
            <div
              ref={sentinelRef}
              className="mt-8 mb-6 flex w-full items-center justify-center py-6"
            >
              {loadingMore ? (
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                  <span>自动加载中...</span>
                </div>
              ) : !hasMore && items.length > 0 ? (
                <p className="text-xs text-zinc-300 select-none">
                  已加载全部内容
                </p>
              ) : null}
            </div>
          </>
        )}

        {/* Creator Drawer Modal for Mobile */}
        <CreatorDrawer
          creators={creators}
          selectedCreatorId={selectedCreatorId}
          onSelectCreator={setSelectedCreatorId}
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
      </div>
    </div>
  );
}
