import React, { useState, useEffect } from 'react';
import { KeyRound, ShieldCheck, LogOut, Loader2, BookmarkPlus, X } from 'lucide-react';
import { MediaFeed } from './components/MediaFeed';
import { DesktopLightbox } from './components/DesktopLightbox';
import { MobileVerticalFeed } from './components/MobileVerticalFeed';
import { WeChatGuide } from './components/WeChatGuide';
import type { MediaAsset } from './types';

interface AuthState {
  authenticated: boolean;
  daysRemaining: number | null;
  passId: string | null;
  loading: boolean;
  error: string | null;
  evicted: boolean;
  expired: boolean;
}

export default function App() {
  const [auth, setAuth] = useState<AuthState>({
    authenticated: false,
    daysRemaining: null,
    passId: null,
    loading: true,
    error: null,
    evicted: false,
    expired: false,
  });

  const [inputCode, setInputCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // WeChat in-app browser detection
  const [isWeChat] = useState(() => {
    if (typeof navigator === 'undefined') return false;
    return /MicroMessenger/i.test(navigator.userAgent);
  });
  const [weChatDismissed, setWeChatDismissed] = useState(false);

  // Active media viewer state
  const [activeMedia, setActiveMedia] = useState<MediaAsset | null>(null);
  const [activeMediaList, setActiveMediaList] = useState<MediaAsset[]>([]);
  const [mobileFeedIndex, setMobileFeedIndex] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 768);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Merge old code modal
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [oldMergeCode, setOldMergeCode] = useState('');
  const [mergeStatus, setMergeStatus] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);

  // Check auth or URL hash #key=... on mount
  useEffect(() => {
    async function initAuth() {
      // 1. Check URL hash for direct access key #key=XXXX
      const hash = window.location.hash;
      const keyMatch = hash.match(/#key=([^&]+)/);

      if (keyMatch && keyMatch[1]) {
        const directKey = decodeURIComponent(keyMatch[1]).trim();
        if (directKey) {
          try {
            const res = await fetch('/api/auth/redeem', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code: directKey }),
            });
            const data = (await res.json()) as {
              success?: boolean;
              days_remaining?: number;
              pass_id?: string;
              error?: string;
            };
            if (res.ok && data.success) {
              // Strip hash from address bar for security
              if (window.history && window.history.replaceState) {
                window.history.replaceState(
                  null,
                  '',
                  window.location.pathname + window.location.search
                );
              } else {
                window.location.hash = '';
              }

              setAuth({
                authenticated: true,
                daysRemaining: data.days_remaining ?? null,
                passId: data.pass_id ?? null,
                loading: false,
                error: null,
                evicted: false,
                expired: false,
              });
              return;
            }
          } catch {
            // Ignore error and fall through to standard check
          }
        }
      }

      // 2. Check existing session via /api/auth/me
      try {
        const res = await fetch('/api/auth/me');
        const data = (await res.json()) as {
          authenticated?: boolean;
          days_remaining?: number;
          pass_id?: string;
          evicted?: boolean;
          expired?: boolean;
        };

        if (res.ok && data.authenticated) {
          setAuth({
            authenticated: true,
            daysRemaining: data.days_remaining ?? null,
            passId: data.pass_id ?? null,
            loading: false,
            error: null,
            evicted: false,
            expired: false,
          });
          return;
        }

        if (data.expired) {
          setAuth({
            authenticated: false,
            daysRemaining: 0,
            passId: data.pass_id ?? null,
            loading: false,
            error: null,
            evicted: false,
            expired: true,
          });
          return;
        }

        if (data.evicted) {
          setAuth({
            authenticated: false,
            daysRemaining: null,
            passId: null,
            loading: false,
            error: null,
            evicted: true,
            expired: false,
          });
          return;
        }
      } catch {
        // Fall back to unauthenticated
      }

      setAuth((prev) => ({ ...prev, loading: false }));
    }

    initAuth();
  }, []);

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!inputCode.trim() || submitting) return;

    setSubmitting(true);
    setAuth((prev) => ({ ...prev, error: null }));

    try {
      const res = await fetch('/api/auth/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: inputCode.trim(),
          ...(auth.expired && auth.passId ? { pass_id: auth.passId } : {}),
        }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        days_remaining?: number;
        pass_id?: string;
        error?: string;
        expired?: boolean;
      };

      if (res.ok && data.success) {
        setAuth({
          authenticated: true,
          daysRemaining: data.days_remaining ?? null,
          passId: data.pass_id ?? null,
          loading: false,
          error: null,
          evicted: false,
          expired: false,
        });
      } else if (data.expired) {
        setAuth({
          authenticated: false,
          daysRemaining: 0,
          passId: data.pass_id ?? null,
          loading: false,
          error: '该卡密已过期，请输入新购买的卡密进行续期',
          evicted: false,
          expired: true,
        });
        setInputCode('');
      } else {
        setAuth((prev) => ({
          ...prev,
          error: data.error || '无效的卡密，请核对后再试',
        }));
      }
    } catch {
      setAuth((prev) => ({
        ...prev,
        error: '网络连接失败，请检查网络后重试',
      }));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    }
    setAuth({
      authenticated: false,
      daysRemaining: null,
      passId: null,
      loading: false,
      error: null,
      evicted: false,
      expired: false,
    });
    setInputCode('');
  }

  async function handleMergeOldCode(e: React.FormEvent) {
    e.preventDefault();
    if (!oldMergeCode.trim() || merging) return;

    setMerging(true);
    setMergeStatus(null);

    try {
      const res = await fetch('/api/auth/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_code: oldMergeCode.trim() }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string; message?: string };
      if (res.ok && data.success) {
        setMergeStatus('历史收藏已成功合并到当前通行证！');
        setOldMergeCode('');
        setTimeout(() => setShowMergeModal(false), 2000);
      } else {
        setMergeStatus(data.error || '合并失败，请核对卡密');
      }
    } catch {
      setMergeStatus('网络错误，请稍后重试');
    } finally {
      setMerging(false);
    }
  }

  async function handleToggleBookmark(mediaId: string, current: boolean) {
    const next = !current;

    // Optimistic update for activeMedia
    if (activeMedia && activeMedia.id === mediaId) {
      setActiveMedia({ ...activeMedia, is_bookmarked: next });
    }

    // Optimistic update for activeMediaList
    setActiveMediaList((prev) =>
      prev.map((item) => (item.id === mediaId ? { ...item, is_bookmarked: next } : item))
    );

    try {
      const res = await fetch(`/api/media/${mediaId}/bookmark`, { method: 'POST' });
      if (!res.ok) {
        // Rollback
        if (activeMedia && activeMedia.id === mediaId) {
          setActiveMedia({ ...activeMedia, is_bookmarked: current });
        }
        setActiveMediaList((prev) =>
          prev.map((item) => (item.id === mediaId ? { ...item, is_bookmarked: current } : item))
        );
      }
    } catch {
      // Rollback
      if (activeMedia && activeMedia.id === mediaId) {
        setActiveMedia({ ...activeMedia, is_bookmarked: current });
      }
      setActiveMediaList((prev) =>
        prev.map((item) => (item.id === mediaId ? { ...item, is_bookmarked: current } : item))
      );
    }
  }

  // WeChat In-App Browser Guidance View
  if (isWeChat && !weChatDismissed) {
    return <WeChatGuide onDismiss={() => setWeChatDismissed(true)} />;
  }

  // Loading spinner
  if (auth.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-zinc-500">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  // Expired Pass Renewal View
  if (auth.expired) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200">
              <KeyRound className="h-7 w-7 text-amber-700" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              通行证已到期
            </h1>
            <p className="text-sm text-zinc-500 leading-relaxed">
              您的 30 天访问期已结束。输入新购买的卡密即可立即续期，历史收藏将完整保留。
            </p>
          </div>

          <form onSubmit={handleRedeem} className="mt-8 space-y-4">
            <div className="space-y-1">
              <label htmlFor="renewal-code" className="sr-only">
                续费卡密
              </label>
              <input
                id="renewal-code"
                name="code"
                type="text"
                required
                autoFocus
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="输入续费卡密..."
                className="block w-full rounded-xl border border-zinc-200 bg-white px-4 py-3.5 text-center text-base tracking-widest text-zinc-900 placeholder:text-zinc-400 placeholder:tracking-normal focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 transition-all font-mono"
              />
            </div>

            {auth.error && (
              <div className="rounded-lg bg-rose-50 p-3 text-center text-xs font-medium text-rose-600">
                {auth.error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !inputCode.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>续费中...</span>
                </>
              ) : (
                <span>立即续费</span>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Authenticated Shell View
  if (auth.authenticated) {
    return (
      <div className="min-h-screen bg-white text-zinc-900 flex flex-col font-sans">
        {/* Top Navbar */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-zinc-100 bg-white/80 px-4 md:px-8 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold tracking-tight text-zinc-900">
              Cutie Gallery
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              {auth.daysRemaining} 天有效期
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMergeModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
              title="合并旧卡密收藏"
            >
              <BookmarkPlus className="h-3.5 w-3.5" />
              <span>合并旧卡密收藏</span>
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
              title="退出登录"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>退出</span>
            </button>
          </div>
        </header>

        {/* Merge Old Code Modal */}
        {showMergeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-zinc-100 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-zinc-900">
                  合并历史收藏
                </h3>
                <button
                  onClick={() => setShowMergeModal(false)}
                  className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-zinc-500 leading-relaxed">
                如果您在新设备直接使用了新卡密登录，可在此输入以前使用过的老卡密，系统将把老卡密名下的全部收藏无缝合并到当前通行证。
              </p>

              <form onSubmit={handleMergeOldCode} className="space-y-3">
                <input
                  type="text"
                  required
                  value={oldMergeCode}
                  onChange={(e) => setOldMergeCode(e.target.value.toUpperCase())}
                  placeholder="输入曾用过的老卡密..."
                  className="block w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-center text-sm font-mono tracking-wider text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />

                {mergeStatus && (
                  <p className="text-center text-xs font-medium text-emerald-600">
                    {mergeStatus}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={merging || !oldMergeCode.trim()}
                  className="w-full rounded-xl bg-zinc-900 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-zinc-800 disabled:opacity-50 transition-all"
                >
                  {merging ? '合并中...' : '确认合并'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Main Content Area - Media Feed */}
        <main className="flex-1 flex flex-col w-full">
          <MediaFeed
            onToggleBookmark={handleToggleBookmark}
            onSelectMedia={(media, list) => {
              setActiveMediaList(list);
              const idx = list.findIndex((m) => m.id === media.id);
              if (isMobile) {
                setMobileFeedIndex(idx >= 0 ? idx : 0);
              } else {
                setActiveMedia(media);
              }
            }}
          />
        </main>

        {/* Desktop Lightbox Modal */}
        {!isMobile && (
          <DesktopLightbox
            media={activeMedia}
            mediaList={activeMediaList}
            onClose={() => setActiveMedia(null)}
            onSelectMedia={setActiveMedia}
            onToggleBookmark={handleToggleBookmark}
          />
        )}

        {/* Mobile Vertical Swipe Feed */}
        {isMobile && mobileFeedIndex !== null && (
          <MobileVerticalFeed
            initialIndex={mobileFeedIndex}
            mediaList={activeMediaList}
            onClose={() => setMobileFeedIndex(null)}
            onToggleBookmark={handleToggleBookmark}
          />
        )}
      </div>
    );
  }

  // Unauthenticated Landing Page
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-50 border border-zinc-100 shadow-xs">
            <KeyRound className="h-7 w-7 text-zinc-700" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Cutie Gallery
          </h1>
          <p className="text-sm text-zinc-500">
            高品质私有媒体归档画廊 · 专属通行证访问
          </p>
        </div>

        {auth.evicted && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center space-y-1">
            <p className="text-sm font-semibold text-amber-900">
              该通行证已在其他设备登录
            </p>
            <p className="text-xs text-amber-700">
              单通行证最多允许 2 台设备同时使用。若需在此设备继续使用，请重新输入卡密进入。
            </p>
          </div>
        )}

        <form onSubmit={handleRedeem} className="mt-8 space-y-4">
          <div className="space-y-1">
            <label htmlFor="access-code" className="sr-only">
              访问卡密
            </label>
            <input
              id="access-code"
              name="code"
              type="text"
              required
              autoFocus
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="输入访问卡密..."
              className="block w-full rounded-xl border border-zinc-200 bg-white px-4 py-3.5 text-center text-base tracking-widest text-zinc-900 placeholder:text-zinc-400 placeholder:tracking-normal focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 transition-all font-mono"
            />
          </div>

          {auth.error && (
            <div className="rounded-lg bg-rose-50 p-3 text-center text-xs font-medium text-rose-600">
              {auth.error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !inputCode.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>核销中...</span>
              </>
            ) : (
              <span>进入画廊</span>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-400 leading-relaxed">
          卡密可在面包多商品订单中获取。
          <br />
          输入即可免密登录，已绑定的设备将自动同步。
        </p>
      </div>
    </div>
  );
}
