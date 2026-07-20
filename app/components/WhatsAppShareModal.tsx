'use client';

import React, { useState } from 'react';
import { X, Copy, Share2, Check, ExternalLink, Sparkles, MessageCircle, Download, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

type WhatsAppShareModalProps = {
  isOpen: boolean;
  onClose: () => void;
  article: {
    id: string;
    title: string;
    subtitle?: string | null;
    image?: string | null;
    category?: string;
    publishedAt?: string | null;
  };
};

const PRESET_CAPTIONS = [
  'Sheeesh, the new update is here! 🔥😳 And boy, this is crazy! 🤯',
  '🔥 High Alert! New MLBB Ghana announcement dropped:',
  '⚔️ Patch Notes breakdown is live! Don\'t miss this:',
  '🎁 New skins, revamps, and rewards announced! Check it out:',
];

export function WhatsAppShareModal({ isOpen, onClose, article }: WhatsAppShareModalProps) {
  const [customCaption, setCustomCaption] = useState(PRESET_CAPTIONS[0]);
  const [copied, setCopied] = useState(false);
  const [sharingMedia, setSharingMedia] = useState(false);

  if (!isOpen) return null;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://botsville.com';
  const articleUrl = `${baseUrl}/news/${article.id}`;
  const displayImage = article.image || '/mlbb_logobg.png';

  const fullMessage = `${customCaption ? customCaption + '\n\n' : ''}🔥 *${article.title.trim()}*\n${article.subtitle ? '_' + article.subtitle.trim() + '_\n' : ''}\n👇 Read full update on Botsville:\n${articleUrl}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullMessage);
      setCopied(true);
      toast.success('WhatsApp caption & link copied!', {
        description: 'Paste it directly into any WhatsApp chat or status.',
      });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Failed to copy message');
    }
  };

  const handleShareWhatsAppText = () => {
    const encoded = encodeURIComponent(fullMessage);
    const waUrl = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // Direct Media File Share (attaches the image file itself to WhatsApp if supported)
  const handleShareImageFile = async () => {
    if (!displayImage) return;
    setSharingMedia(true);
    try {
      const response = await fetch(displayImage);
      const blob = await response.blob();
      const filename = `botsville-news-${article.id}.jpg`;
      const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: article.title,
          text: fullMessage,
        });
        toast.success('Media image & caption sent to WhatsApp!');
      } else {
        // Fallback: Download image and copy text
        await handleDownloadImage();
        await handleCopy();
        toast.info('Image downloaded & caption copied!', {
          description: 'Now attach the downloaded image in WhatsApp & paste the caption.',
        });
      }
    } catch {
      toast.error('Could not share media file directly', {
        description: 'Copying link and caption instead...',
      });
      handleCopy();
      handleShareWhatsAppText();
    } finally {
      setSharingMedia(false);
    }
  };

  // Download high-res image for WhatsApp Status / Direct media upload
  const handleDownloadImage = async () => {
    try {
      const response = await fetch(displayImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `botsville-news-${article.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Image downloaded for WhatsApp upload!');
    } catch {
      toast.error('Failed to download image');
    }
  };

  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-[#0e1017] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-gradient-to-r from-[#128C7E]/20 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center text-black font-black shadow-md shadow-[#25D366]/20">
              <MessageCircle size={18} fill="currentColor" className="text-black" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">WhatsApp Media Share</h3>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Image preview & caption generator</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Localhost / Public URL Guidance Notice */}
          {isLocalhost && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <span>⚠️</span> Localhost Notice for WhatsApp Preview Cards:
              </p>
              <p className="text-[11px] text-amber-300/80 leading-relaxed">
                WhatsApp's automated preview card generator requires a public domain to scrape images. Use <strong>"Share Image File"</strong> below to send the actual image + caption directly!
              </p>
            </div>
          )}

          {/* Preset Caption Selector */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-[#e8a000] mb-2 flex items-center gap-1.5">
              <Sparkles size={12} /> Quick Comment / Intro Caption
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {PRESET_CAPTIONS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => setCustomCaption(preset)}
                  className={`text-left text-xs p-2.5 rounded-lg border transition-all ${
                    customCaption === preset
                      ? 'bg-[#25D366]/15 border-[#25D366] text-white font-medium'
                      : 'bg-white/[0.02] border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Caption Input */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
              Custom Intro Message
            </label>
            <textarea
              rows={2}
              value={customCaption}
              onChange={(e) => setCustomCaption(e.target.value)}
              placeholder="Add your own commentary..."
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#25D366] transition-colors"
            />
          </div>

          {/* WhatsApp Preview Box (Simulated WhatsApp Message Bubble) */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">
              WhatsApp Card Preview
            </label>
            
            {/* WhatsApp Chat Background Container */}
            <div className="p-4 rounded-xl bg-[#0b141a] border border-white/10 relative overflow-hidden" style={{ backgroundImage: 'radial-gradient(#ffffff0a 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
              
              {/* WhatsApp Message Bubble */}
              <div className="max-w-[95%] ml-auto bg-[#005c4b] text-white rounded-2xl rounded-tr-xs p-2.5 shadow-lg border border-white/5 space-y-2">
                
                {/* Embedded Media Preview Card */}
                <div className="rounded-xl overflow-hidden bg-[#024035] border border-white/10">
                  {/* Media Image */}
                  <div className="relative aspect-video w-full bg-zinc-900 overflow-hidden">
                    <img
                      src={displayImage}
                      alt={article.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/mlbb_logobg.png';
                      }}
                    />
                  </div>

                  {/* Open Graph Card Content */}
                  <div className="p-2.5 bg-[#03362d]/95">
                    <p className="text-xs font-black text-white leading-snug line-clamp-2">
                      {article.title}
                    </p>
                    {article.subtitle && (
                      <p className="text-[11px] text-zinc-300 line-clamp-2 mt-1 leading-normal">
                        {article.subtitle}
                      </p>
                    )}
                    <p className="text-[10px] text-emerald-400 font-mono mt-1.5 truncate">
                      {baseUrl.replace(/^https?:\/\//, '')}
                    </p>
                  </div>
                </div>

                {/* Caption text */}
                {customCaption && (
                  <p className="text-xs text-white/90 whitespace-pre-wrap leading-relaxed px-1">
                    {customCaption}
                  </p>
                )}

                {/* Link */}
                <p className="text-xs text-emerald-300 underline underline-offset-2 break-all px-1">
                  {articleUrl}
                </p>

                {/* Timestamp & Checkmark indicator */}
                <div className="flex items-center justify-end gap-1 text-[9px] text-emerald-300/60 pt-0.5 px-1 font-mono">
                  <span>Just now</span>
                  <span>✓✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-black/40 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Action 1: Share Image File + Caption directly */}
            <button
              onClick={handleShareImageFile}
              disabled={sharingMedia}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-[#25D366] hover:opacity-90 text-black text-xs font-black uppercase tracking-wider transition-all shadow-md"
            >
              <ImageIcon size={16} fill="black" />
              <span>{sharingMedia ? 'Sharing Media...' : 'Share Image + Caption'}</span>
            </button>

            {/* Action 2: Open WhatsApp Text & Link */}
            <button
              onClick={handleShareWhatsAppText}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-black text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-[#25D366]/20"
            >
              <MessageCircle size={16} fill="black" />
              <span>Open WhatsApp</span>
              <ExternalLink size={12} />
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 text-xs">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-300 font-bold transition-all text-xs"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? 'Copied!' : 'Copy Caption & Link'}</span>
            </button>

            <button
              onClick={handleDownloadImage}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-300 font-bold transition-all text-xs"
              title="Download image for WhatsApp Status"
            >
              <Download size={14} />
              <span>Image</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
