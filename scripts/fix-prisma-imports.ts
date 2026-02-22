import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const apiDir = "./app/api";

function processFile(filePath: string): void {
  let content = readFileSync(filePath, "utf-8");
  
  // Check if file imports PrismaClient
  if (!content.includes('import { PrismaClient } from "@/app/generated/prisma/client"')) {
    return;
  }
  
  console.log(`Processing: ${filePath}`);
  
  // Remove the PrismaClient import
  content = content.replace(
    /import { PrismaClient } from "@\/app\/generated\/prisma\/client";\n/g,
    ""
  );
  
  // Check if file already imports prisma from lib/prisma
  if (!content.includes('import { prisma } from "@/lib/prisma"')) {
    // Add the new import after the first import statement
    const firstImportEnd = content.indexOf(";\n") + 2;
    content = 
      content.slice(0, firstImportEnd) + 
      'import { prisma } from "@/lib/prisma";\n' + 
      content.slice(firstImportEnd);
  }
  
  // Remove any `const prisma = new PrismaClient();` lines
  content = content.replace(/const prisma = new PrismaClient\(\);\n?/g, "");
  
  writeFileSync(filePath, content);
}

function walkDir(dir: string): void {
  const files = readdirSync(dir);
  
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith(".ts")) {
      processFile(filePath);
    }
  }
}

console.log("Starting PrismaClient import fix...");
walkDir(apiDir);
console.log("Done!");
