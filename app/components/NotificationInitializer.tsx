'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { subscribeToCommunityPosts, unsubscribeFromChannel } from '@/lib/socket-client';

export default function NotificationInitializer() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? null;
  const [permission, setPermission] = useState<'default' | 'granted' | 'denied'>(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [dismissed, setDismissed] = useState(false);

  const handleRetry = () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.error('Notifications not supported in this browser', { duration: 3000 });
      return;
    }

    try {
      const maybePromise = Notification.requestPermission((perm) => {
        setPermission(perm as any);
        if (perm === 'granted') toast.success('Notifications enabled', { duration: 3000 });
        else if (perm === 'denied') toast.error('Notifications blocked', { duration: 3000 });
      });

      // Handle Promise-based implementations
      if (maybePromise && typeof (maybePromise as any).then === 'function') {
        (maybePromise as Promise<NotificationPermission>).then((perm) => {
          setPermission(perm as any);
          if (perm === 'granted') toast.success('Notifications enabled', { duration: 3000 });
          else if (perm === 'denied') toast.error('Notifications blocked', { duration: 3000 });
        }).catch(() => {});
      }
    } catch (err) {
      // Fallback: try promise form
      try {
        Notification.requestPermission().then((perm) => {
          setPermission(perm as any);
          if (perm === 'granted') toast.success('Notifications enabled', { duration: 3000 });
          else if (perm === 'denied') toast.error('Notifications blocked', { duration: 3000 });
        }).catch(() => {});
      } catch (e) {
        toast.error('Unable to request notification permission', { duration: 3000 });
      }
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Prompt for permission if needed
    if ('Notification' in window && session) {
      setPermission(Notification.permission as any);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((perm) => {
          setPermission(perm as any);
          if (perm === 'granted') toast.success('Notifications enabled', { duration: 3000 });
          else if (perm === 'denied') toast.error('Notifications blocked', { duration: 3000 });
        }).catch(() => {});
      }
    }

    const handleNewPost = (payload: unknown) => {
      const post = payload as any;
      if (!post?.id) return;

      if (
        post.author?.id !== currentUserId &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        const authorName = post.author?.ign ?? 'Someone';
        const body = post.title
          ? post.title
          : post.content?.length > 80
            ? post.content.slice(0, 80) + '…'
            : post.content;

        const notif = new Notification(`${authorName} posted in Community`, {
          body,
          icon: '/mlbb_logo.png',
          badge: '/mlbb_logo.png',
          tag: 'community-post-' + post.id,
        });
        notif.onclick = () => { window.focus(); notif.close(); };
      }
    };

    // Subscribe
    subscribeToCommunityPosts(handleNewPost);

    return () => { unsubscribeFromChannel('community'); };
  }, [currentUserId, session]);

  // In-app prompt to help users re-enable notifications if they previously denied them
  if (permission === 'denied' && session && !dismissed) {
    return (
      <div className="fixed bottom-6 right-6 z-50 max-w-xs bg-[#0c0c12] border border-white/10 p-3 rounded-lg shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <div className="text-sm font-semibold text-white">Notifications blocked</div>
            <div className="text-xs text-zinc-400 mt-1">You previously blocked browser notifications. Re-enable to get live community post alerts.</div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleRetry}
                className="px-3 py-1 text-xs font-bold uppercase bg-[#e8a000]/10 border border-[#e8a000]/30 text-[#e8a000] rounded"
              >Retry</button>
              <button
                onClick={() => window.open('https://support.google.com/chrome/answer/3220216', '_blank')}
                className="px-3 py-1 text-xs font-bold uppercase border border-white/10 text-white rounded"
              >How to enable</button>
              <button onClick={() => setDismissed(true)} className="ml-auto text-xs text-zinc-400">Dismiss</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
