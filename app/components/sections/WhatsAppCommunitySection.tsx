'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Copy, Check, QrCode, X } from 'lucide-react';
import { toast } from 'sonner';

const WHATSAPP_COMMUNITY_URL = 'https://chat.whatsapp.com/JJnIPabbxCmB3R7abTRjWs';
const QR_URL = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&margin=16&data=${encodeURIComponent(WHATSAPP_COMMUNITY_URL)}`;

// WhatsApp brand mark, unmodified geometry and colour.
// Source: https://commons.wikimedia.org/wiki/File:WhatsApp_Logo_green.svg
// The source credits WhatsApp / Meta Brand Resources.
function WhatsAppLogo({ size = 36 }: { size?: number }) {
  return (<svg width={size} height={size} aria-hidden="true" focusable="false" viewBox="0 0 360 362" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M307.546 52.5655C273.709 18.685 228.706 0.0171895 180.756 0C81.951 0 1.53846 80.404 1.50408 179.235C1.48689 210.829 9.74646 241.667 25.4319 268.844L0 361.736L95.0236 336.811C121.203 351.096 150.683 358.616 180.679 358.625H180.756C279.544 358.625 359.966 278.212 360 179.381C360.017 131.483 341.392 86.4547 307.546 52.5741V52.5655ZM180.756 328.354H180.696C153.966 328.346 127.744 321.16 104.865 307.589L99.4242 304.358L43.034 319.149L58.0834 264.168L54.5423 258.53C39.6304 234.809 31.749 207.391 31.7662 179.244C31.8006 97.1036 98.6334 30.2707 180.817 30.2707C220.61 30.2879 258.015 45.8015 286.145 73.9665C314.276 102.123 329.755 139.562 329.738 179.364C329.703 261.513 262.871 328.346 180.756 328.346V328.354ZM262.475 216.777C257.997 214.534 235.978 203.704 231.869 202.209C227.761 200.713 224.779 199.966 221.796 204.452C218.814 208.939 210.228 219.029 207.615 222.011C205.002 225.002 202.389 225.372 197.911 223.128C193.434 220.885 179.003 216.158 161.891 200.902C148.578 189.024 139.587 174.362 136.975 169.875C134.362 165.389 136.7 162.965 138.934 160.739C140.945 158.728 143.412 155.505 145.655 152.892C147.899 150.279 148.638 148.406 150.133 145.423C151.629 142.432 150.881 139.82 149.764 137.576C148.646 135.333 139.691 113.287 135.952 104.323C132.316 95.5909 128.621 96.777 125.879 96.6309C123.266 96.5019 120.284 96.4762 117.293 96.4762C114.302 96.4762 109.454 97.5935 105.346 102.08C101.238 106.566 89.6691 117.404 89.6691 139.441C89.6691 161.478 105.716 182.785 107.959 185.776C110.202 188.767 139.544 234.001 184.469 253.408C195.153 258.023 203.498 260.782 210.004 262.845C220.731 266.257 230.494 265.776 238.212 264.624C246.816 263.335 264.71 253.786 268.44 243.326C272.17 232.866 272.17 223.893 271.053 222.028C269.936 220.163 266.945 219.037 262.467 216.794L262.475 216.777Z" fill="#25D366" />
  </svg>
  );
}

export function WhatsAppCommunitySection() {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrFailed, setQrFailed] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current); }, []);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (showQR && !dialog?.open) dialog?.showModal();
    if (!showQR && dialog?.open) dialog.close();
    if (!showQR) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [showQR]);

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(WHATSAPP_COMMUNITY_URL);
      setCopied(true);
      toast.success('Invite link copied');
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Could not copy the link. Open the community and share its invite.');
    }
  };

  return (
    <section id="whatsapp" className="bwa-section" aria-labelledby="bwa-title">
      <style>{styles}</style>
      <div className="bwa-container">
        <div className="bwa-card">
          <div className="bwa-content">
            <div className="bwa-label"><WhatsAppLogo size={22} /><span>THE BOTSVILLE COMMUNITY</span></div>
            <h2 id="bwa-title">Good games start with <span>good company.</span></h2>
            <p>Find your next squad, arrange scrims and catch tournament updates with Ghana’s MLBB community.</p>
            <ul className="bwa-topics" aria-label="Community topics"><li>Find teammates</li><li>Scrim invites</li><li>Tournament updates</li></ul>
          </div>
          <div className="bwa-invite">
            <div className="bwa-group">
              <WhatsAppLogo size={34} />
              <div><strong>Botsville MLBB Ghana</strong><span>Join the conversation on WhatsApp</span></div>
            </div>
            <a className="bwa-join" href={WHATSAPP_COMMUNITY_URL} target="_blank" rel="noopener noreferrer">
              <span>Join the community</span><ArrowUpRight size={16} /><span className="bwa-sr"> (opens in a new tab)</span>
            </a>
            <div className="bwa-tools">
              <button type="button" onClick={() => void copyInvite()}>{copied ? <Check size={13} /> : <Copy size={13} />}<span aria-live="polite">{copied ? 'Link copied' : 'Copy invite'}</span></button>
              <span className="bwa-divider" aria-hidden="true" />
              <button type="button" onClick={() => { setQrFailed(false); setShowQR(true); }} aria-haspopup="dialog"><QrCode size={14} />Scan to join</button>
            </div>
          </div>
        </div>
      </div>
      <dialog ref={dialogRef} className="bwa-dialog" aria-labelledby="bwa-qr-title" onCancel={() => setShowQR(false)} onClose={() => setShowQR(false)}
        onClick={e => { if (e.target === e.currentTarget) setShowQR(false); }}>
        <div className="bwa-dialog-inner">
          <button className="bwa-close" type="button" aria-label="Close QR code" onClick={() => setShowQR(false)}><X size={18} /></button>
          <WhatsAppLogo size={32} />
          <h3 id="bwa-qr-title">Bring the chat to your phone.</h3>
          <p>Scan with your camera to open the Botsville invite in WhatsApp.</p>
          {showQR && (qrFailed ? <div className="bwa-qr-failed" role="status">The QR code couldn’t load. Use the invite button below.</div> :
            /* Native img preserves the existing QR service without Next image host configuration. */
            /* eslint-disable-next-line @next/next/no-img-element */
            <img className="bwa-qr" src={QR_URL} width={224} height={224} alt="QR code for the Botsville WhatsApp community invite" onError={() => setQrFailed(true)} />)}
          <a className="bwa-join" href={WHATSAPP_COMMUNITY_URL} target="_blank" rel="noopener noreferrer">Open WhatsApp<ArrowUpRight size={16} /><span className="bwa-sr"> (opens in a new tab)</span></a>
        </div>
      </dialog>
    </section>
  );
}

const styles = `
.bwa-section{background:#0a0c10;color:#eeeFE9;padding:24px 0;scroll-margin-top:72px;font-family:Arial,Helvetica,sans-serif}
.bwa-section *{box-sizing:border-box}.bwa-container{max-width:1180px;margin:auto;padding:0 24px}.bwa-card{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:40px;padding:28px 32px;border:1px solid #ffffff12;border-radius:12px;background:#101318}.bwa-content{align-self:center;min-width:0}.bwa-label{display:flex;align-items:center;gap:10px;color:#a3aaa7;font-size:9px;letter-spacing:1.6px;font-weight:600}.bwa-label svg{flex-shrink:0}.bwa-content h2{font-size:clamp(21px,2.2vw,28px);line-height:1.2;letter-spacing:-.8px;font-weight:700;margin:14px 0 10px;max-width:470px}.bwa-content h2 span{display:block}.bwa-content p{font-size:12px;line-height:1.7;color:#adb3b0;max-width:420px;margin:0}.bwa-topics{display:flex;flex-wrap:wrap;gap:6px 16px;list-style:none;padding:0;margin:16px 0 0;color:#969f99;font-size:10px}.bwa-topics li{display:flex;align-items:center;gap:7px}.bwa-topics li:before{content:'';width:3px;height:3px;background:#75897d;border-radius:50%}.bwa-invite{align-self:center;border-left:1px solid #ffffff12;padding-left:28px}.bwa-group{display:flex;align-items:center;gap:12px;margin-bottom:18px}.bwa-group>svg{flex-shrink:0}.bwa-group strong{display:block;font-size:12px;line-height:1.5;font-weight:600}.bwa-group span{display:block;font-size:10px;color:#9ca69f;line-height:1.5;margin-top:3px}.bwa-join{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:44px;background:#25d366;border:1px solid #25d366;border-radius:6px;padding:12px 15px;text-decoration:none;color:#052c16;font-size:11px;font-weight:700;transition:background .15s}.bwa-join:hover{background:#43df7d;border-color:#43df7d}.bwa-tools{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:6px}.bwa-tools button{display:inline-flex;align-items:center;gap:6px;min-height:44px;background:none;border:0;padding:0 2px;color:#aeb7b0;font:inherit;font-size:10px;cursor:pointer}.bwa-tools button:hover{color:#fff}.bwa-divider{height:11px;width:1px;background:#ffffff20}.bwa-section :is(a,button):focus-visible{outline:2px solid #8ee7af;outline-offset:4px}.bwa-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.bwa-dialog{padding:0;border:1px solid #ffffff20;border-radius:14px;background:#11161a;color:#eef1eb;width:min(350px,calc(100% - 32px));max-height:calc(100dvh - 32px);margin:auto;overflow:auto}.bwa-dialog::backdrop{background:#000b;backdrop-filter:blur(4px)}.bwa-dialog-inner{padding:28px 24px 24px;position:relative;text-align:center}.bwa-dialog-inner>svg{margin:auto;display:block}.bwa-close{position:absolute;top:8px;right:8px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;border:0;background:none;color:#b5bfb6;cursor:pointer}.bwa-dialog h3{font-size:19px;letter-spacing:-.5px;line-height:1.3;margin:16px 0 8px}.bwa-dialog p{font-size:12px;line-height:1.6;color:#a4afa8;margin:0 auto 20px;max-width:250px}.bwa-qr{display:block;width:224px;max-width:100%;height:auto;aspect-ratio:1;margin:0 auto 20px;background:#fff;border-radius:4px}.bwa-qr-failed{font-size:12px;line-height:1.6;padding:24px 0;color:#d3d8d1}
@media(max-width:850px){.bwa-card{gap:24px;padding:24px;grid-template-columns:minmax(0,1fr) 260px}.bwa-invite{padding-left:20px}.bwa-content h2{font-size:23px}.bwa-topics{gap:7px 12px}}
@media(max-width:620px){.bwa-section{padding:16px 0}.bwa-container{padding:0 16px}.bwa-card{grid-template-columns:minmax(0,1fr);gap:20px;padding:22px 20px;border-radius:10px}.bwa-label{font-size:8px;letter-spacing:1.3px}.bwa-content h2{font-size:23px;margin:14px 0 10px;max-width:310px}.bwa-content p{font-size:11px;max-width:360px}.bwa-topics{font-size:9px;gap:8px 12px;margin-top:14px}.bwa-invite{border-left:0;border-top:1px solid #ffffff12;padding:16px 0 0}.bwa-group{margin-bottom:14px;gap:10px}.bwa-group>svg{width:28px;height:28px}.bwa-group strong{font-size:11px}.bwa-group span{font-size:9px}.bwa-tools{margin-top:4px}.bwa-dialog-inner{padding:28px 20px 20px}}
@media(prefers-reduced-motion:reduce){.bwa-section *{transition:none!important}}
`;
