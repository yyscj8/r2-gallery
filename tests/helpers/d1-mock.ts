import { DatabaseSync } from 'node:sqlite';

export function createTestD1(): D1Database {
  const sqlite = new DatabaseSync(':memory:');

  const db = {
    prepare(query: string) {
      let boundParams: any[] = [];
      return {
        bind(...params: any[]) {
          boundParams = params;
          return this;
        },
        async first<T = unknown>(colName?: string): Promise<T | null> {
          const stmt = sqlite.prepare(query);
          const row = stmt.get(...boundParams) as Record<string, any> | undefined;
          if (!row) return null;
          if (colName) return (row[colName] as T) ?? null;
          return row as T;
        },
        async all<T = unknown>(): Promise<D1Result<T>> {
          const stmt = sqlite.prepare(query);
          const results = stmt.all(...boundParams) as T[];
          return {
            results,
            success: true,
            meta: {} as any,
          };
        },
        async run(): Promise<D1Response> {
          const stmt = sqlite.prepare(query);
          stmt.run(...boundParams);
          return {
            success: true,
            meta: {} as any,
          };
        },
        async raw<T = unknown>(): Promise<T[]> {
          const stmt = sqlite.prepare(query);
          return stmt.all(...boundParams) as T[];
        },
      } as unknown as D1PreparedStatement;
    },
    async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
      const results: D1Result<T>[] = [];
      for (const stmt of statements) {
        results.push(await stmt.all<T>());
      }
      return results;
    },
    async exec(query: string): Promise<D1ExecResult> {
      sqlite.exec(query);
      return {
        count: 0,
        duration: 0,
      };
    },
    withSession() {
      return this as unknown as D1DatabaseSession;
    },
    dump(): Promise<ArrayBuffer> {
      throw new Error('Not implemented in mock');
    },
  };

  return db as unknown as D1Database;
}
