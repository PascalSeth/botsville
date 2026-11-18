'use client';

import { Dialog } from 'radix-ui';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import styles from '../my-team.module.css';

export const fieldClass = 'min-h-12 w-full min-w-0 rounded-xl border border-white/15 bg-[#111c2b] px-3 py-3 text-base sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50';
export const buttonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-[#142033] px-4 py-3 text-xs font-semibold text-zinc-200 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-amber-400 disabled:opacity-40 disabled:cursor-not-allowed';
export const primaryClass = buttonClass + ' !bg-[#e9b963] !text-[#11151d] hover:!bg-[#f4ce87]';

export default function TeamActionDialog({ open, onClose, title, description, busy = false, children }: {
  open: boolean; onClose: () => void; title: string; description: string; busy?: boolean; children: ReactNode;
}) {
  return <Dialog.Root open={open} onOpenChange={value => { if (!value && !busy) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className={styles.dialogOverlay} />
      <Dialog.Content className={styles.dialog}>
        <Dialog.Title className={styles.dialogTitle}>{title}</Dialog.Title>
        <Dialog.Description className="mt-2 text-sm leading-relaxed text-zinc-400">{description}</Dialog.Description>
        <Dialog.Close disabled={busy} aria-label="Close dialog" className={styles.dialogClose}><X size={20} /></Dialog.Close>
        <div className="mt-6">{children}</div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
