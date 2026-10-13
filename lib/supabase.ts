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
  IMAGES: 'images',
  TEAMS: 'teams',
  PLAYERS: 'players',
  FAN_ART: 'fan-art',
  SCRIM_VAULT: 'scrim-vault',
  VIDEOS: 'videos',
} as const;

/**
 * Automatically compress an image in the browser using HTML Canvas before upload
 * Resizes down to max 1600x1600 and compresses to save bandwidth and storage.
 */
export async function compressImageClient(
  file: File | Blob,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.82
): Promise<File | Blob> {
  if (typeof window === 'undefined') return file;
  if (!file.type || !file.type.startsWith('image/')) return file;
  // Skip SVGs and GIFs to preserve vector scalability and animations
  if (file.type.includes('svg') || file.type.includes('gif')) return file;
  // Skip if already tiny (< 100 KB)
  if (file.size < 100 * 1024) return file;

  return new Promise((resolve) => {
    try {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);

        ctx.drawImage(img, 0, 0, width, height);

        const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              if (file instanceof File) {
                resolve(new File([blob], file.name, { type: blob.type }));
              } else {
                resolve(blob);
              }
            } else {
              resolve(file);
            }
          },
          outputType,
          quality
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };
      img.src = url;
    } catch {
      resolve(file);
    }
  });
}

/**
 * Convert a File to a compressed base64 data URL before posting to /api/upload
 * Greatly speeds up upload and prevents 413 Payload Too Large errors.
 */
export async function fileToCompressedDataUrl(
  file: File,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.82
): Promise<string> {
  const compressed = await compressImageClient(file, maxWidth, maxHeight, quality);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(compressed);
  });
}

// Helper function to upload an image to Supabase storage
export async function uploadImage(
  bucket: string,
  path: string,
  file: File | Blob,
  options?: { upsert?: boolean }
): Promise<{ url: string | null; error: Error | null }> {
  try {
    const uploadFile = await compressImageClient(file);
    console.log(
      '[Supabase] Uploading to bucket:',
      bucket,
      'path:',
      path,
      `size: ${(uploadFile.size / 1024).toFixed(1)} KB`
    );
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, uploadFile, {
        upsert: options?.upsert ?? false,
        cacheControl: '31536000, immutable',
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
