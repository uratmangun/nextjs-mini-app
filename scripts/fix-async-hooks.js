#!/usr/bin/env node

// Post-build script to ensure async_hooks polyfill is available for Cloudflare Pages
const fs = require('fs');
const path = require('path');

const polyfillContent = `// Auto-generated polyfill for async_hooks in Cloudflare Workers
// This provides minimal implementations for Cloudflare Workers compatibility

export class AsyncLocalStorage {
  constructor() {
    this._store = new Map();
  }
  
  run(store, callback, ...args) {
    // In Workers, we can't truly track async context, so we just execute the callback
    const previousStore = this._store;
    this._store = store;
    try {
      return callback(...args);
    } finally {
      this._store = previousStore;
    }
  }
  
  getStore() {
    return this._store;
  }
  
  enterWith(store) {
    this._store = store;
  }
  
  disable() {
    this._store = new Map();
  }
}

export const createHook = () => ({
  enable: () => {},
  disable: () => {},
});

export const executionAsyncId = () => 1;
export const triggerAsyncId = () => 0;
export const executionAsyncResource = () => null;

export default {
  AsyncLocalStorage,
  createHook,
  executionAsyncId,
  triggerAsyncId,
  executionAsyncResource,
};

// Also export as CommonJS for compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    AsyncLocalStorage,
    createHook,
    executionAsyncId,
    triggerAsyncId,
    executionAsyncResource,
  };
}`;

// Try multiple possible locations where the build output might be
const possiblePaths = [
  '.vercel/output/static/_worker.js/__next-on-pages-dist__/functions',
  '.vercel/output/static/__next-on-pages-dist__/functions',
  '.vercel/output/functions/__next-on-pages-dist__/functions',
  '.vercel/output/static/_worker.js/chunks',
  '.vercel/output/static/_worker.js',
];

let created = false;

// First, check if any of the directories exist
for (const relativePath of possiblePaths) {
  const outputDir = path.join(process.cwd(), relativePath);
  const polyfillPath = path.join(outputDir, 'async_hooks.js');
  
  if (fs.existsSync(outputDir)) {
    fs.writeFileSync(polyfillPath, polyfillContent);
    console.log('✅ Created async_hooks polyfill at:', polyfillPath);
    created = true;
  }
}

// If none exist, create in all possible locations (create directories if needed)
if (!created) {
  console.log('📁 Creating async_hooks polyfill in all possible locations...');
  
  for (const relativePath of possiblePaths) {
    const outputDir = path.join(process.cwd(), relativePath);
    const polyfillPath = path.join(outputDir, 'async_hooks.js');
    
    try {
      // Create directory if it doesn't exist
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(polyfillPath, polyfillContent);
      console.log('✅ Created async_hooks polyfill at:', polyfillPath);
      created = true;
    } catch (err) {
      console.log(`⚠️  Failed to create in ${relativePath}:`, err.message);
    }
  }
}

// Also look for the worker.js file and try to patch it directly
const workerPath = path.join(process.cwd(), '.vercel/output/static/_worker.js/index.js');
if (fs.existsSync(workerPath)) {
  console.log('🔍 Found worker file, patching async_hooks imports...');
  
  let workerContent = fs.readFileSync(workerPath, 'utf8');
  let modified = false;
  
  // Replace the import statement with inline polyfill
  if (workerContent.includes('"__next-on-pages-dist__/functions/async_hooks"') || 
      workerContent.includes("'__next-on-pages-dist__/functions/async_hooks'")) {
    console.log('📝 Replacing async_hooks import with inline polyfill...');
    
    // Replace module imports with inline implementation
    workerContent = workerContent.replace(
      /import\s+\{([^}]+)\}\s+from\s+["']__next-on-pages-dist__\/functions\/async_hooks["'];?/g,
      (match, imports) => {
        console.log(`  Replacing import: ${match}`);
        return `// Polyfilled async_hooks import
const AsyncLocalStorage = class {
  constructor() { this._store = new Map(); }
  run(store, callback, ...args) { 
    const previousStore = this._store;
    this._store = store;
    try { return callback(...args); } 
    finally { this._store = previousStore; }
  }
  getStore() { return this._store; }
  enterWith(store) { this._store = store; }
  disable() { this._store = new Map(); }
};
const createHook = () => ({ enable: () => {}, disable: () => {} });
const executionAsyncId = () => 1;
const triggerAsyncId = () => 0;
const executionAsyncResource = () => null;`;
      }
    );
    
    // Also handle require() style imports if any
    workerContent = workerContent.replace(
      /require\(["']__next-on-pages-dist__\/functions\/async_hooks["']\)/g,
      `({ 
        AsyncLocalStorage: class {
          constructor() { this._store = new Map(); }
          run(store, callback, ...args) { 
            const previousStore = this._store;
            this._store = store;
            try { return callback(...args); } 
            finally { this._store = previousStore; }
          }
          getStore() { return this._store; }
          enterWith(store) { this._store = store; }
          disable() { this._store = new Map(); }
        },
        createHook: () => ({ enable: () => {}, disable: () => {} }),
        executionAsyncId: () => 1,
        triggerAsyncId: () => 0,
        executionAsyncResource: () => null
      })`
    );
    
    modified = true;
  }
  
  // Also check for the bundled format where async_hooks might be referenced differently
  if (workerContent.includes('async_hooks') && !workerContent.includes('// Polyfilled async_hooks')) {
    console.log('📝 Found other async_hooks references, adding polyfill definitions...');
    
    // Add polyfill at the beginning of the file
    const polyfillDef = `// Global async_hooks polyfill for Cloudflare Workers
if (!globalThis.async_hooks) {
  globalThis.async_hooks = {
    AsyncLocalStorage: class {
      constructor() { this._store = new Map(); }
      run(store, callback, ...args) { 
        const previousStore = this._store;
        this._store = store;
        try { return callback(...args); } 
        finally { this._store = previousStore; }
      }
      getStore() { return this._store; }
      enterWith(store) { this._store = store; }
      disable() { this._store = new Map(); }
    },
    createHook: () => ({ enable: () => {}, disable: () => {} }),
    executionAsyncId: () => 1,
    triggerAsyncId: () => 0,
    executionAsyncResource: () => null
  };
}
`;
    workerContent = polyfillDef + workerContent;
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(workerPath, workerContent);
    console.log('✅ Patched worker file successfully');
  } else {
    console.log('ℹ️  No async_hooks imports found in worker file');
  }
}

if (!created) {
  console.log('⚠️  Warning: Could not create async_hooks polyfill in any expected location');
  console.log('📁 Current directory structure:');
  
  // List the .vercel directory structure for debugging
  const vercelDir = path.join(process.cwd(), '.vercel');
  if (fs.existsSync(vercelDir)) {
    const listDir = (dir, indent = '') => {
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stats = fs.statSync(fullPath);
        console.log(indent + (stats.isDirectory() ? '📁 ' : '📄 ') + item);
        if (stats.isDirectory() && indent.length < 8) {
          listDir(fullPath, indent + '  ');
        }
      });
    };
    listDir(vercelDir);
  }
}
