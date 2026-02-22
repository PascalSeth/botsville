import * as fs from 'fs';
import * as path from 'path';

// Files to fix
const filesToFix = [
  'app/api/tournaments/[id]/withdraw/route.ts',
  'app/api/tournaments/[id]/route.ts',
  'app/api/tournaments/[id]/register/route.ts',
  'app/api/tournaments/[id]/registrations/route.ts',
  'app/api/tournaments/[id]/prizes/route.ts',
  'app/api/tournaments/[id]/matches/route.ts',
  'app/api/teams/[id]/name-history/route.ts',
  'app/api/teams/[id]/invites/route.ts',
  'app/api/teams/[id]/invite-links/route.ts',
  'app/api/teams/[id]/players/[playerId]/route.ts',
  'app/api/seasons/[id]/route.ts',
  'app/api/news/[id]/route.ts',
  'app/api/news/[id]/reactions/route.ts',
  'app/api/matches/[id]/screenshots/route.ts',
  'app/api/matches/[id]/route.ts',
  'app/api/matches/[id]/draft/route.ts',
  'app/api/matches/[id]/dispute/route.ts',
  'app/api/matches/[id]/performance/route.ts',
  'app/api/invites/[id]/respond/route.ts',
  'app/api/fan-art/[id]/report/route.ts',
  'app/api/admin/roles/[userId]/route.ts',
  'app/api/invite-links/[code]/join/route.ts',
];

function fixFile(filePath: string) {
  const fullPath = path.resolve(filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf-8');
  let modified = false;

  // Fix params type from { params: { id: string } } to { params: Promise<{ id: string }> }
  const paramsTypeRegex = /\{ params: \{ (\w+): string \} \}/g;
  if (paramsTypeRegex.test(content)) {
    content = content.replace(/\{ params: \{ (\w+): string \} \}/g, '{ params: Promise<{ $1: string }> }');
    modified = true;
  }

  // Fix params type with multiple params like { id: string; playerId: string }
  const multiParamsTypeRegex = /\{ params: \{ ([^}]+; [^}]+) \} \}/g;
  if (multiParamsTypeRegex.test(content)) {
    content = content.replace(/\{ params: \{ ([^}]+; [^}]+) \} \}/g, '{ params: Promise<{ $1 }> }');
    modified = true;
  }

  // Fix params destructuring from const { id } = params; to const { id } = await params;
  const singleParamDestructure = /const \{ (\w+) \} = params;/g;
  if (singleParamDestructure.test(content)) {
    content = content.replace(/const \{ (\w+) \} = params;/g, 'const { $1 } = await params;');
    modified = true;
  }

  // Fix multi-param destructuring
  const multiParamDestructure = /const \{ ([^}]+, [^}]+) \} = params;/g;
  if (multiParamDestructure.test(content)) {
    content = content.replace(/const \{ ([^}]+, [^}]+) \} = params;/g, 'const { $1 } = await params;');
    modified = true;
  }

  // Fix error type from error: any to error: unknown
  const errorTypeRegex = /catch \(error: any\)/g;
  if (errorTypeRegex.test(content)) {
    content = content.replace(/catch \(error: any\)/g, 'catch (error: unknown)');
    modified = true;
  }

  // Fix error.message access
  const errorMessageRegex = /error\.message/g;
  if (errorMessageRegex.test(content)) {
    // Only replace if not already wrapped in instanceof check
    content = content.replace(
      /return apiError\(error\.message \|\|/g,
      'const message = error instanceof Error ? error.message : "Unknown error";\\n    return apiError(message ||'
    );
    modified = true;
  }

  // Fix updateData: any to updateData: Record<string, unknown>
  const updateDataRegex = /const updateData: any/g;
  if (updateDataRegex.test(content)) {
    content = content.replace(/const updateData: any/g, 'const updateData: Record<string, unknown>');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`Fixed: ${filePath}`);
  } else {
    console.log(`No changes needed: ${filePath}`);
  }
}

// Process all files
filesToFix.forEach(fixFile);

console.log('\\nDone!');
