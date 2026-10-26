export function createTestR2(): R2Bucket {
  const store = new Map<string, { data: Uint8Array; httpMetadata?: Record<string, string> }>();

  return {
    async get(key: string, options?: R2GetOptions): Promise<R2ObjectBody | null> {
      const item = store.get(key);
      if (!item) return null;

      let data = item.data;
      const totalSize = data.byteLength;
      let rangeResult: R2Range | undefined = undefined;

      // Handle Range option
      if (options?.range) {
        let offset = 0;
        let length = totalSize;

        if ('offset' in options.range && options.range.offset !== undefined) {
          offset = options.range.offset;
          if ('length' in options.range && options.range.length !== undefined) {
            length = options.range.length;
          } else {
            length = totalSize - offset;
          }
        } else if ('suffix' in options.range && options.range.suffix !== undefined) {
          offset = Math.max(0, totalSize - options.range.suffix);
          length = totalSize - offset;
        }

        const end = Math.min(totalSize, offset + length);
        data = data.subarray(offset, end);
        rangeResult = { offset, length: data.byteLength };
      }

      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(data);
          controller.close();
        },
      });

      return {
        key,
        size: totalSize,
        body: stream,
        range: rangeResult,
        writeHttpMetadata(headers: Headers) {
          if (item.httpMetadata) {
            for (const [k, v] of Object.entries(item.httpMetadata)) {
              headers.set(k, v);
            }
          }
        },
      } as unknown as R2ObjectBody;
    },
    async put(key: string, value: any, options?: R2PutOptions): Promise<R2Object> {
      let data: Uint8Array;
      if (typeof value === 'string') {
        data = new TextEncoder().encode(value);
      } else if (value instanceof Uint8Array) {
        data = value;
      } else if (value instanceof ArrayBuffer) {
        data = new Uint8Array(value);
      } else {
        data = new Uint8Array();
      }

      store.set(key, {
        data,
        httpMetadata: options?.httpMetadata as Record<string, string>,
      });

      return {
        key,
        size: data.byteLength,
      } as unknown as R2Object;
    },
    async delete(key: string | string[]): Promise<void> {
      if (Array.isArray(key)) {
        for (const k of key) store.delete(k);
      } else {
        store.delete(key);
      }
    },
    async list(): Promise<R2Objects> {
      return {
        objects: [],
        truncated: false,
      } as unknown as R2Objects;
    },
    async head(key: string): Promise<R2Object | null> {
      const item = store.get(key);
      if (!item) return null;
      return {
        key,
        size: item.data.byteLength,
      } as unknown as R2Object;
    },
  } as unknown as R2Bucket;
}
