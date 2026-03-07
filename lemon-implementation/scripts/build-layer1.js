/**
 * Build Script — Layer 1 Validation
 * Validates syntax of all Layer 1 (7 Petreas) source files
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, '../src');

const LAYER1_FILES = [
  'index.js',
  'petreas/01-soul-state/index.js',
  'petreas/02-preload/index.js',
  'petreas/03-audit-trail/index.js',
  'petreas/04-credential-encryption/index.js',
  'petreas/05-extension-security/index.js',
  'petreas/06-integrity-monitor/index.js',
  'petreas/07-network-isolation/index.js'
];

async function validateSyntax(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    
    // Basic syntax validation
    const hasImports = content.includes('import') || content.includes('require');
    const hasExports = content.includes('export') || content.includes('module.exports');
    const hasClass = content.includes('class ') || content.includes('function ');
    
    if (!hasExports) {
      throw new Error('Missing export statement');
    }
    
    if (!hasClass) {
      throw new Error('Missing class or function definition');
    }
    
    // Check for basic syntax errors with regex
    const bracketCount = (content.match(/{/g) || []).length - (content.match(/}/g) || []).length;
    if (bracketCount !== 0) {
      throw new Error('Mismatched braces');
    }
    
    const parenCount = (content.match(/\(/g) || []).length - (content.match(/\)/g) || []).length;
    if (parenCount !== 0) {
      throw new Error('Mismatched parentheses');
    }
    
    return { file: filePath, status: '✅ VALID' };
  } catch (err) {
    return { file: filePath, status: `❌ ERROR: ${err.message}` };
  }
}

async function buildLayer1() {
  console.log('\n🔧 Building Layer 1 (7 Petreas)...\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const file of LAYER1_FILES) {
    const filePath = path.join(srcDir, file);
    const result = await validateSyntax(filePath);
    
    console.log(`  ${result.status}  ${file}`);
    
    if (result.status.includes('❌')) {
      failed++;
    } else {
      passed++;
    }
  }
  
  console.log(`\n✅ Layer 1: ${passed}/${LAYER1_FILES.length} modules valid\n`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

buildLayer1().catch(err => {
  console.error('❌ Build failed:', err.message);
  process.exit(1);
});
