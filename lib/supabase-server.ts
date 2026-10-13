import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured');
  }

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured. Server uploads require service role key to bypass RLS.');
  }

  // Service-role client bypasses RLS — server-side storage operations only.
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function serverUploadBase64Image(
  bucket: string,
  path: string,
  base64Data: string
): Promise<{ url: string | null; error: Error | null }> {
  // If it's already a valid HTTP URL, return it directly
  if (base64Data.startsWith('http://') || base64Data.startsWith('https://')) {
    return { url: base64Data, error: null };
  }

  // Locate base64 marker
  const commaIndex = base64Data.indexOf(';base64,');
  if (commaIndex === -1) {
    return { url: null, error: new Error('Invalid base64 image/video data format') };
  }

  const prefix = base64Data.slice(0, commaIndex);
  const base64 = base64Data.slice(commaIndex + 8); // Skip ";base64,"

  // Support both image/* and video/* MIME types
  const prefixMatch = prefix.match(/^data:(image|video)\/([a-zA-Z0-9.+_-]+)/);
  if (!prefixMatch) {
    return { url: null, error: new Error('Invalid base64 image/video mime type') };
  }

  const mimeCategory = prefixMatch[1]; // image or video
  const subType = prefixMatch[2].toLowerCase(); // jpeg, png, webp, svg+xml, etc.
  const extension = subType === 'jpeg' ? 'jpg' : subType.split('+')[0];

  let uploadBuffer: Buffer<ArrayBufferLike> = Buffer.from(base64, 'base64');
  const fullPath = `${path}.${extension}`;

  // Automatically compress images before writing to Supabase storage
  if (mimeCategory === 'image' && subType !== 'svg' && subType !== 'gif') {
    try {
      const originalBytes = uploadBuffer.length;
      let pipeline = sharp(uploadBuffer as unknown as Buffer).resize({
        width: 1600,
        height: 1600,
        fit: 'inside',
        withoutEnlargement: true,
      });

      if (subType === 'png') {
        pipeline = pipeline.png({ quality: 80, compressionLevel: 9, palette: true });
      } else if (subType === 'webp') {
        pipeline = pipeline.webp({ quality: 80 });
      } else {
        pipeline = pipeline.jpeg({ quality: 80, mozjpeg: true });
      }

      const compressed = await pipeline.toBuffer();
      if (compressed.length < originalBytes) {
        console.log(
          `[ServerUpload] Auto-compressed image: ${(originalBytes / 1024).toFixed(1)} KB -> ${(compressed.length / 1024).toFixed(1)} KB`
        );
        uploadBuffer = compressed;
      }
    } catch (compressErr) {
      console.warn('[ServerUpload] Sharp compression skipped, using original:', compressErr);
    }
  }

  try {
    const supabaseAdmin = getSupabaseAdminClient();

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(fullPath, uploadBuffer, {
        upsert: true,
        contentType: `${mimeCategory}/${subType}`,
        cacheControl: '31536000, immutable',
      });

    if (error) {
      return { url: null, error: error as Error };
    }

    const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(data.path);
    return { url: urlData.publicUrl, error: null };
  } catch (error) {
    return { url: null, error: error as Error };
  }
}

