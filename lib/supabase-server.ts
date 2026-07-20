import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getSupabaseAdminClient() {
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
  // Locate base64 marker
  const commaIndex = base64Data.indexOf(';base64,');
  if (commaIndex === -1) {
    return { url: null, error: new Error('Invalid base64 image/video data format') };
  }

  const prefix = base64Data.slice(0, commaIndex);
  const base64 = base64Data.slice(commaIndex + 8); // Skip ";base64,"

  // Support both image/* and video/* MIME types
  const prefixMatch = prefix.match(/^data:(image|video)\/(\w+)$/);
  if (!prefixMatch) {
    return { url: null, error: new Error('Invalid base64 image/video mime type') };
  }

  const mimeType = prefixMatch[1];
  const extension = prefixMatch[2] || 'png';

  const byteCharacters = atob(base64);
  const byteArray = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteArray[i] = byteCharacters.charCodeAt(i);
  }
  const blob = new Blob([byteArray], { type: `${mimeType}/${extension}` });
  const fullPath = `${path}.${extension}`;

  try {
    const supabaseAdmin = getSupabaseAdminClient();

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(fullPath, blob, {
        upsert: true,
        cacheControl: '3600',
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
