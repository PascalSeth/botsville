import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('[Supabase] Initializing with URL:', supabaseUrl ? 'SET' : 'NOT SET');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Environment variables are not set. Image uploads will not work.');
}

// Create Supabase client for client-side usage
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Storage bucket names
export const STORAGE_BUCKETS = {
  TEAMS: 'teams',
  PLAYERS: 'players',
  FAN_ART: 'fan-art',
  SCRIM_VAULT: 'scrim-vault',
} as const;

// Helper function to upload an image to Supabase storage
export async function uploadImage(
  bucket: string,
  path: string,
  file: File | Blob,
  options?: { upsert?: boolean }
): Promise<{ url: string | null; error: Error | null }> {
  try {
    console.log('[Supabase] Uploading to bucket:', bucket, 'path:', path);
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert: options?.upsert ?? false,
        cacheControl: '3600',
      });

    if (error) {
      console.error('[Supabase] Upload error:', error);
      return { url: null, error };
    }

    console.log('[Supabase] Upload successful, path:', data.path);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    console.log('[Supabase] Public URL:', urlData.publicUrl);
    return { url: urlData.publicUrl, error: null };
  } catch (error) {
    console.error('[Supabase] Upload exception:', error);
    return { url: null, error: error as Error };
  }
}

// Helper function to upload a base64 image to Supabase storage
export async function uploadBase64Image(
  bucket: string,
  path: string,
  base64Data: string,
  options?: { upsert?: boolean }
): Promise<{ url: string | null; error: Error | null }> {
  try {
    console.log('[Supabase] Processing base64 image...');
    
    // Extract the base64 data from the data URL
    const base64Match = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      console.error('[Supabase] Invalid base64 format');
      return { url: null, error: new Error('Invalid base64 image data') };
    }

    const extension = base64Match[1] || 'png';
    const base64 = base64Match[2];
    
    console.log('[Supabase] Image extension:', extension, 'Base64 length:', base64.length);
    
    // Convert base64 to Buffer/Blob
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: `image/${extension}` });

    console.log('[Supabase] Blob created, size:', blob.size, 'type:', blob.type);

    // Upload to Supabase
    const fullPath = `${path}.${extension}`;
    return uploadImage(bucket, fullPath, blob, options);
  } catch (error) {
    console.error('[Supabase] Base64 conversion error:', error);
    return { url: null, error: error as Error };
  }
}

// Helper function to delete an image from Supabase storage
export async function deleteImage(
  bucket: string,
  path: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    return { error };
  } catch (error) {
    return { error: error as Error };
  }
}

// Generate a unique file path for uploads
export function generateFilePath(prefix: string, id: string, type: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}/${id}/${timestamp}-${random}-${type}`;
}
