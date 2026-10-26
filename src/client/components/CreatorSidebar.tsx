import React, { useState } from 'react';
import { Search, Users, Check, X } from 'lucide-react';
import type { Creator } from '../types';

interface CreatorSidebarProps {
  creators: Creator[];
  selectedCreatorId: string | null;
  onSelectCreator: (id: string | null) => void;
}

export function CreatorSidebar({
  creators,
  selectedCreatorId,
  onSelectCreator,
}: CreatorSidebarProps) {
  const [search, setSearch] = useState('');

  const filtered = creators.filter((c) =>
    c.handle.toLowerCase().includes(search.toLowerCase().trim())
  );

  const totalCount = creators.reduce((acc, c) => acc + c.media_count, 0);

  return (
    <div className="flex flex-col h-full w-full bg-white select-none">
      {/* Sidebar Header */}
      <div className="flex h-14 items-center justify-between border-b border-zinc-100 px-4 shrink-0">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-zinc-900" />
          <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
            博主列表
          </h2>
        </div>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
          {creators.length} 位
        </span>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-zinc-100 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索博主 handle..."
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 pl-8 pr-7 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white focus:outline-none transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-zinc-400 hover:text-zinc-600"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Creator Navigation Items */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
        {/* All Creators Button */}
        <button
          onClick={() => onSelectCreator(null)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
            selectedCreatorId === null
              ? 'bg-zinc-900 text-white shadow-xs'
              : 'text-zinc-700 hover:bg-zinc-50'
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

        {/* Individual Creator Buttons */}
        {filtered.map((creator) => {
          const isSelected = selectedCreatorId === creator.id;
          return (
            <button
              key={creator.id}
              onClick={() => onSelectCreator(creator.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              <div className="flex items-center gap-2 truncate pr-1">
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
          <div className="py-8 text-center text-xs text-zinc-400">
            无匹配博主
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-zinc-100 text-center shrink-0">
        <p className="text-[11px] text-zinc-400">
          共 {totalCount} 项媒体归档
        </p>
      </div>
    </div>
  );
}
