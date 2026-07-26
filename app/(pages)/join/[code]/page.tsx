'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function JoinTeamByCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();

  useEffect(() => {
    if (code) {
      router.replace(`/teams/${code}`);
    }
  }, [code, router]);

  return (
    <div className="min-h-screen bg-[#07070c] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={32} className="animate-spin text-amber-400" />
        <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">
          Joining Squad via Invite Link...
        </p>
      </div>
    </div>
  );
}
