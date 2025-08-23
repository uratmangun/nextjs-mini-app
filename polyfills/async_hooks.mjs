// Polyfill for async_hooks module in Cloudflare Workers
// This provides compatibility for Next.js features that depend on async_hooks

export class AsyncLocalStorage {
  constructor() {
    this._store = new Map();
  }
  
  run(store, callback, ...args) {
    // In Workers, we simulate async context tracking
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
  
  static bind(fn) {
    const als = this;
    const store = als.getStore();
    return (...args) => {
      return als.run(store, fn, ...args);
    };
  }
  
  static snapshot() {
    const als = this;
    const store = als.getStore();
    return (fn) => {
      return (...args) => {
        return als.run(store, fn, ...args);
      };
    };
  }
}

export const createHook = (callbacks) => ({
  enable: () => {},
  disable: () => {},
});

export const executionAsyncId = () => 1;
export const triggerAsyncId = () => 0;
export const executionAsyncResource = () => null;

// Polyfill for AsyncResource
export class AsyncResource {
  constructor(type, options = {}) {
    this.type = type;
    this.asyncId = executionAsyncId();
    this.triggerAsyncId = options.triggerAsyncId || triggerAsyncId();
  }
  
  bind(fn) {
    return fn.bind(this);
  }
  
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.apply(thisArg, args);
  }
  
  emitDestroy() {
    // No-op in Workers environment
  }
  
  asyncId() {
    return this.asyncId;
  }
  
  triggerAsyncId() {
    return this.triggerAsyncId;
  }
}

export default {
  AsyncLocalStorage,
  AsyncResource,
  createHook,
  executionAsyncId,
  triggerAsyncId,
  executionAsyncResource,
};
