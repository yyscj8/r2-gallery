import React, { useState, useEffect } from 'react';
import { Compass, Copy, Check, Globe, ShieldAlert } from 'lucide-react';

interface WeChatGuideProps {
  onDismiss: () => void;
}

export function WeChatGuide({ onDismiss }: WeChatGuideProps) {
  const [copied, setCopied] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isApple = /iPhone|iPad|iPod/i.test(ua);
    setIsIOS(isApple);

    // On Android, attempt Chrome/system intent launch
    if (/Android/i.test(ua)) {
      const cleanUrl = window.location.href.replace(/^https?:\/\//, '');
      const intentUrl = `intent://${cleanUrl}#Intent;scheme=https;action=android.intent.action.VIEW;end`;
      const timer = setTimeout(() => {
        try {
          window.location.href = intentUrl;
        } catch {
          // Ignore
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCopyLink = async () => {
    const currentUrl = window.location.href;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentUrl);
      } else {
        const input = document.createElement('input');
        input.value = currentUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div
      data-testid="wechat-guide-overlay"
      className="fixed inset-0 z-[100] flex flex-col justify-between bg-white/98 text-zinc-900 px-6 py-6 font-sans backdrop-blur-md select-none overflow-y-auto"
    >
      {/* Top Right Guidance Indicator */}
      <div className="flex justify-end pr-2 pt-1">
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5 rounded-full bg-zinc-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg animate-pulse">
            <span>点击右上角</span>
            <span className="font-mono text-base tracking-widest leading-none">···</span>
          </div>

          {/* Curved Arrow pointing to the top-right menu */}
          <svg
            className="h-16 w-16 text-zinc-900 mr-2 -mt-1"
            viewBox="0 0 100 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M 20 80 Q 70 80 80 25" />
            <path d="M 65 25 L 80 20 L 85 38" />
          </svg>
        </div>
      </div>

      {/* Center Guidance Content */}
      <div className="my-auto flex flex-col items-center text-center max-w-sm mx-auto space-y-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-100 border border-zinc-200/80 shadow-xs">
          <Compass className="h-8 w-8 text-zinc-900 animate-spin-slow" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">
            请在手机系统浏览器中打开
          </h1>
          <p className="text-xs text-zinc-500 leading-relaxed max-w-xs mx-auto">
            微信内置浏览器限制了竖屏手势滑动、高清视频硬件加速及长效通行证保持。
          </p>
        </div>

        {/* Steps Card */}
        <div className="w-full rounded-2xl border border-zinc-200/90 bg-zinc-50/80 p-5 text-left space-y-3 shadow-xs">
          <div className="flex items-start gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-bold text-white">
              1
            </span>
            <span className="text-xs text-zinc-700 leading-5">
              点击右上角 <strong className="font-semibold text-zinc-900">「···」</strong> 更多选项
            </span>
          </div>

          <div className="flex items-start gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-bold text-white">
              2
            </span>
            <span className="text-xs text-zinc-700 leading-5">
              选择{' '}
              <strong className="font-semibold text-zinc-900 underline underline-offset-2">
                {isIOS ? '「在 Safari 中打开」' : '「在浏览器中打开」'}
              </strong>
            </span>
          </div>
        </div>

        {/* Copy Link Button */}
        <div className="w-full space-y-2">
          <button
            onClick={handleCopyLink}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3.5 px-4 text-sm font-semibold text-white shadow-xs hover:bg-zinc-800 active:scale-[0.99] transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" />
                <span>链接已复制！去浏览器粘贴打开</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>复制网址前往系统浏览器</span>
              </>
            )}
          </button>
          {copied && (
            <p className="text-[11px] text-emerald-600 font-medium">
              已将完整链接（含通行证）复制至剪贴板
            </p>
          )}
        </div>
      </div>

      {/* Footer / Bypass */}
      <div className="pt-4 text-center">
        <button
          onClick={onDismiss}
          className="text-xs text-zinc-400 hover:text-zinc-600 underline underline-offset-4 cursor-pointer py-2 transition-colors"
        >
          我知道了，暂且在微信内继续访问
        </button>
      </div>
    </div>
  );
}
