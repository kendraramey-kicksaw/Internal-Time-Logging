type D1Result<T = unknown> = {
  meta?: unknown;
  results?: T[];
  success?: boolean;
};

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<D1Result>;
}

interface D1Database {
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<T[]>;
  prepare(query: string): D1PreparedStatement;
}

interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

declare module "cloudflare:workers" {
  export const env: {
    DB?: D1Database;
  };
}
