import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Admin client bypasses RLS — for server-side storage operations only
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function serverUploadBase64Image(
  bucket: string,
  path: string,
  base64Data: string
): Promise<{ url: string | null; error: Error | null }> {
  const base64Match = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!base64Match) {
    return { url: null, error: new Error('Invalid base64 image data') };
  }

  const extension = base64Match[1] || 'png';
  const base64 = base64Match[2];

  const byteCharacters = atob(base64);
  const byteArray = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteArray[i] = byteCharacters.charCodeAt(i);
  }
  const blob = new Blob([byteArray], { type: `image/${extension}` });
  const fullPath = `${path}.${extension}`;

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
}
