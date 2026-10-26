import React, { useState } from 'react';
import { Search, Users, X, Check } from 'lucide-react';
import type { Creator } from '../types';

interface CreatorDrawerProps {
  creators: Creator[];
  selectedCreatorId: string | null;
  onSelectCreator: (id: string | null) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function CreatorDrawer({
  creators,
  selectedCreatorId,
  onSelectCreator,
  isOpen,
  onClose,
}: CreatorDrawerProps) {
  const [search, setSearch] = useState('');

  const filtered = creators.filter((c) =>
    c.handle.toLowerCase().includes(search.toLowerCase().trim())
  );

  const totalCount = creators.reduce((acc, c) => acc + c.media_count, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative z-10 flex w-full max-w-xs flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-zinc-100 px-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-zinc-700" />
            <h2 className="text-base font-semibold text-zinc-900">博主列表</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-zinc-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索博主 handle..."
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Creator List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* All Creators Option */}
          <button
            onClick={() => {
              onSelectCreator(null);
              onClose();
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
              selectedCreatorId === null
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>全部博主</span>
              {selectedCreatorId === null && <Check className="h-3.5 w-3.5" />}
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                selectedCreatorId === null
                  ? 'bg-zinc-800 text-zinc-200'
                  : 'bg-zinc-100 text-zinc-500'
              }`}
            >
              {totalCount}
            </span>
          </button>

          {/* Filtered Creators */}
          {filtered.map((creator) => {
            const isSelected = selectedCreatorId === creator.id;
            return (
              <button
                key={creator.id}
                onClick={() => {
                  onSelectCreator(creator.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="truncate">{creator.handle}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${
                    isSelected
                      ? 'bg-zinc-800 text-zinc-200'
                      : 'bg-zinc-100 text-zinc-500'
                  }`}
                >
                  {creator.media_count}
                </span>
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div className="p-6 text-center text-xs text-zinc-400">
              未找到匹配的博主
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
