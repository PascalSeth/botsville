import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

// Load .env
const envPath = path.resolve('.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('[Error] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const TARGET_BUCKETS = ['images', 'teams', 'players', 'fan-art', 'scrim-vault'];
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

interface FileEntry {
  bucket: string;
  path: string;
  size: number;
}

async function listAllFilesInBucket(bucket: string, folder = ''): Promise<FileEntry[]> {
  let allFiles: FileEntry[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(folder, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
      console.error(`[${bucket}] Error listing '${folder}':`, error.message);
      break;
    }

    if (!data || data.length === 0) break;

    for (const item of data) {
      if (item.name === '.emptyFolderPlaceholder') continue;
      const fullPath = folder ? `${folder}/${item.name}` : item.name;
      if (item.id === null) {
        // Recursive directory
        const subFiles = await listAllFilesInBucket(bucket, fullPath);
        allFiles = allFiles.concat(subFiles);
      } else {
        const size = (item.metadata as any)?.size || (item as any).size || 0;
        allFiles.push({ bucket, path: fullPath, size });
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return allFiles;
}

async function compressAndUpsert(
  bucket: string,
  filePath: string,
  knownSize: number
): Promise<{ beforeSize: number; afterSize: number } | null> {
  const ext = path.extname(filePath).toLowerCase();
  if (!IMAGE_EXTENSIONS.includes(ext)) {
    return null;
  }

  // If already under 120 KB, skip to save processing time
  if (knownSize > 0 && knownSize < 120 * 1024) {
    return null;
  }

  // 1. Download file
  const { data: blob, error: downloadError } = await supabase.storage.from(bucket).download(filePath);
  if (downloadError || !blob) {
    console.error(`[Download Error] ${bucket}/${filePath}:`, downloadError?.message);
    return null;
  }

  const arrayBuffer = await blob.arrayBuffer();
  const inputBuffer = Buffer.from(arrayBuffer);
  const beforeSize = inputBuffer.length;

  if (beforeSize < 120 * 1024) {
    return null;
  }

  // 2. Compress image with sharp
  try {
    let pipeline = sharp(inputBuffer).resize({
      width: 1600,
      height: 1600,
      fit: 'inside',
      withoutEnlargement: true,
    });

    let contentType = 'image/jpeg';
    if (ext === '.png') {
      pipeline = pipeline.png({ quality: 80, compressionLevel: 9, palette: true });
      contentType = 'image/png';
    } else if (ext === '.webp') {
      pipeline = pipeline.webp({ quality: 80 });
      contentType = 'image/webp';
    } else {
      pipeline = pipeline.jpeg({ quality: 80, mozjpeg: true });
      contentType = 'image/jpeg';
    }

    const compressedBuffer = await pipeline.toBuffer();
    const afterSize = compressedBuffer.length;

    // Only upload if it actually saved space
    if (afterSize >= beforeSize) {
      return null;
    }

    // 3. Upsert back to Supabase in-place
    const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, compressedBuffer, {
      upsert: true,
      contentType,
      cacheControl: '31536000, immutable',
    });

    if (uploadError) {
      console.error(`[Upload Error] ${bucket}/${filePath}:`, uploadError.message);
      return null;
    }

    const savedPct = (((beforeSize - afterSize) / beforeSize) * 100).toFixed(1);
    console.log(
      `✓ [${bucket}] ${filePath}: ${(beforeSize / (1024 * 1024)).toFixed(2)} MB -> ${(afterSize / (1024 * 1024)).toFixed(2)} MB (-${savedPct}%)`
    );

    return { beforeSize, afterSize };
  } catch (err: any) {
    console.error(`[Processing Error] ${bucket}/${filePath}:`, err.message);
    return null;
  }
}

async function run() {
  console.log('=====================================================');
  console.log('  Supabase Storage In-Place Image Compressor');
  console.log('=====================================================\n');

  let allFiles: FileEntry[] = [];
  for (const bucket of TARGET_BUCKETS) {
    process.stdout.write(`Scanning bucket [${bucket}]... `);
    const files = await listAllFilesInBucket(bucket);
    const totalMB = files.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024);
    console.log(`${files.length} objects (${totalMB.toFixed(2)} MB)`);
    allFiles = allFiles.concat(files);
  }

  // Filter for compressible images and sort largest first!
  const compressibleFiles = allFiles
    .filter(f => IMAGE_EXTENSIONS.includes(path.extname(f.path).toLowerCase()) && f.size >= 120 * 1024)
    .sort((a, b) => b.size - a.size);

  const totalCandidateMB = compressibleFiles.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024);
  console.log(`\nFound ${compressibleFiles.length} images >= 120 KB totaling ${totalCandidateMB.toFixed(2)} MB.`);
  console.log('Compressing largest files first to quickly drop below quota...\n');

  let totalBefore = 0;
  let totalAfter = 0;
  let totalProcessed = 0;

  for (let i = 0; i < compressibleFiles.length; i++) {
    const file = compressibleFiles[i];
    const res = await compressAndUpsert(file.bucket, file.path, file.size);
    if (res) {
      totalProcessed++;
      totalBefore += res.beforeSize;
      totalAfter += res.afterSize;
    }
  }

  console.log('\n=====================================================');
  console.log(' Compression Finished');
  console.log('=====================================================');
  console.log(`Total images compressed: ${totalProcessed}`);
  console.log(`Original size:           ${(totalBefore / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`New size:                ${(totalAfter / (1024 * 1024)).toFixed(2)} MB`);
  if (totalBefore > 0) {
    const savedMB = ((totalBefore - totalAfter) / (1024 * 1024)).toFixed(2);
    const pct = (((totalBefore - totalAfter) / totalBefore) * 100).toFixed(1);
    console.log(`Space reclaimed:         ${savedMB} MB (${pct}% reduction)`);
  }
  console.log('=====================================================\n');
}

run().catch(console.error);
