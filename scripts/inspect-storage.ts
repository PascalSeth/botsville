import fs from 'fs';
import path from 'path';
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
  console.error('[Error] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

interface FileInfo {
  bucket: string;
  name: string;
  size: number;
  updated_at?: string;
  created_at?: string;
}

async function listAllFilesInBucket(bucket: string, folder = ''): Promise<FileInfo[]> {
  console.log(`  Listing [${bucket}] folder: '${folder}'...`);
  const { data, error } = await supabase.storage.from(bucket).list(folder, {
    limit: 100,
    sortBy: { column: 'name', order: 'asc' },
  });

  if (error) {
    console.error(`  [${bucket}] Error listing '${folder}':`, error.message);
    return [];
  }

  if (!data) return [];

  let files: FileInfo[] = [];
  for (const item of data) {
    if (item.name === '.emptyFolderPlaceholder') continue;
    const fullPath = folder ? `${folder}/${item.name}` : item.name;
    if (item.id === null) {
      // Subfolder
      const subFiles = await listAllFilesInBucket(bucket, fullPath);
      files = files.concat(subFiles);
    } else {
      const size = (item.metadata as any)?.size || (item as any).size || 0;
      files.push({
        bucket,
        name: fullPath,
        size,
        updated_at: item.updated_at,
        created_at: item.created_at,
      });
    }
  }

  return files;
}

async function inspect() {
  console.log(`Connecting to: ${supabaseUrl}`);
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error('Failed to list buckets:', error.message);
    return;
  }

  console.log(`Found ${buckets.length} buckets: ${buckets.map(b => b.name).join(', ')}\n`);

  let allFiles: FileInfo[] = [];
  const bucketSummaries: Record<string, { count: number; totalBytes: number }> = {};

  for (const bucket of buckets) {
    console.log(`Scanning bucket [${bucket.name}]...`);
    const files = await listAllFilesInBucket(bucket.name);
    const totalBytes = files.reduce((acc, f) => acc + f.size, 0);
    bucketSummaries[bucket.name] = { count: files.length, totalBytes };
    console.log(`-> [${bucket.name}]: ${files.length} files, ${(totalBytes / (1024 * 1024)).toFixed(2)} MB\n`);
    allFiles = allFiles.concat(files);
  }

  console.log('=== BUCKET SUMMARY ===');
  let grandTotalBytes = 0;
  for (const [bName, summary] of Object.entries(bucketSummaries)) {
    grandTotalBytes += summary.totalBytes;
    console.log(
      `- [${bName}]: ${summary.count} files | ${(summary.totalBytes / (1024 * 1024)).toFixed(2)} MB`
    );
  }
  console.log(`\nGRAND TOTAL STORAGE: ${(grandTotalBytes / (1024 * 1024)).toFixed(2)} MB (${(grandTotalBytes / (1024 * 1024 * 1024)).toFixed(3)} GB)`);

  // Sort files by size descending
  allFiles.sort((a, b) => b.size - a.size);
  console.log('\n=== TOP 25 LARGEST FILES ===');
  for (const f of allFiles.slice(0, 25)) {
    console.log(`- [${f.bucket}] ${f.name}: ${(f.size / (1024 * 1024)).toFixed(2)} MB`);
  }
}

inspect().catch(console.error);
