import { mkdir, readFile, unlink } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";

export interface DocumentStorage {
  save(input: {
    placementId: string;
    fileName: string;
    mimeType: string;
    bytes: Uint8Array;
  }): Promise<string>;
  read(storageKey: string): Promise<Uint8Array>;
  remove(storageKey: string): Promise<void>;
}

export class DiskDocumentStorage implements DocumentStorage {
  constructor(private readonly root: string) {}

  async save(input: {
    placementId: string;
    fileName: string;
    mimeType: string;
    bytes: Uint8Array;
  }) {
    const extension = extensionFor(input.mimeType, input.fileName);
    const storageKey = join(input.placementId, `${crypto.randomUUID()}${extension}`);
    const target = this.resolveKey(storageKey);
    await mkdir(dirname(target), { recursive: true });
    await Bun.write(target, input.bytes);
    return storageKey;
  }

  read(storageKey: string) {
    return readFile(this.resolveKey(storageKey));
  }
  async remove(storageKey: string) {
    await unlink(this.resolveKey(storageKey)).catch(() => undefined);
  }

  private resolveKey(storageKey: string) {
    const normalized = normalize(storageKey);
    const target = resolve(this.root, normalized);
    const root = resolve(this.root);
    if (target === root || !target.startsWith(`${root}/`))
      throw new Error("Invalid document storage key");
    return target;
  }
}

function extensionFor(mimeType: string, fileName: string) {
  const allowed = { "application/pdf": ".pdf", "image/jpeg": ".jpg", "image/png": ".png" } as const;
  return allowed[mimeType as keyof typeof allowed] ?? extname(fileName).toLowerCase();
}
