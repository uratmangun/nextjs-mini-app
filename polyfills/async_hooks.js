// Polyfill for async_hooks module in Cloudflare Workers environment
// This module is not available in Cloudflare Workers runtime

export const AsyncLocalStorage = class {
  constructor() {
    this.store = new Map();
  }
  
  run(store, callback, ...args) {
    return callback(...args);
  }
  
  getStore() {
    return undefined;
  }
};

export const createHook = () => ({
  enable: () => {},
  disable: () => {},
});

export const executionAsyncId = () => 0;
export const triggerAsyncId = () => 0;

// Default export for compatibility
export default {
  AsyncLocalStorage,
  createHook,
  executionAsyncId,
  triggerAsyncId,
};
