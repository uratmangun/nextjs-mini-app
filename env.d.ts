/// <reference types="@cloudflare/workers-types" />

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Public environment variables (accessible in browser)
      NEXT_PUBLIC_APP_URL: string;
      NEXT_PUBLIC_API_URL: string;
      NEXT_PUBLIC_APP_NAME?: string;
      NEXT_PUBLIC_APP_DESCRIPTION?: string;
      NEXT_PUBLIC_GA_ID?: string;
      
      // Server-side environment variables
      NODE_ENV: 'development' | 'production' | 'test';
      ENVIRONMENT?: string;
      API_SECRET?: string;
      DATABASE_URL?: string;
      
      // Cloudflare-specific
      CF_ACCOUNT_ID?: string;
      CF_API_TOKEN?: string;
      CF_PAGES_URL?: string;
      CF_PAGES_COMMIT_SHA?: string;
      CF_PAGES_BRANCH?: string;
    }
  }
}

// Cloudflare environment interface
export interface CloudflareEnv {
  // KV Namespaces
  MY_KV?: KVNamespace;
  
  // Durable Objects
  MY_DURABLE_OBJECT?: DurableObjectNamespace;
  
  // R2 Buckets
  MY_BUCKET?: R2Bucket;
  
  // D1 Database
  DB?: D1Database;
  
  // Queues
  MY_QUEUE?: Queue;
  
  // Service bindings
  MY_SERVICE?: Fetcher;
  
  // Analytics Engine
  AE?: AnalyticsEngineDataset;
  
  // Vectorize
  VECTORIZE?: VectorizeIndex;
  
  // AI
  AI?: Ai;
  
  // Browser Rendering
  BROWSER?: BrowserWorker;
  
  // Rate Limiter
  RATE_LIMITER?: RateLimit;
  
  // Hyperdrive
  HYPERDRIVE?: Hyperdrive;
  
  // Environment variables
  ENVIRONMENT: string;
  API_SECRET?: string;
  
  // Assets
  ASSETS: Fetcher;
}

// Extended Request type for Cloudflare Workers
export interface CloudflareRequest extends Request {
  cf?: IncomingRequestCfProperties;
}

// Context for API routes
export interface CloudflareContext {
  env: CloudflareEnv;
  ctx: ExecutionContext;
  cf?: IncomingRequestCfProperties;
}

// Page props with Cloudflare context
export interface CloudflarePageProps<T = any> {
  params?: T;
  searchParams?: { [key: string]: string | string[] | undefined };
}

// API Response helpers
export type CloudflareResponse<T = any> = Response | Promise<Response>;

export {};