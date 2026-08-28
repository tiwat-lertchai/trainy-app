import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DiskDocumentStorage } from "./document-storage";

const temporaryDirectories: string[] = [];
afterEach(async () => { await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });

describe("DiskDocumentStorage", () => {
  test("writes, reads, and removes an opaque file below the configured root", async () => {
    const root = await mkdtemp(join(tmpdir(), "trainy-documents-")); temporaryDirectories.push(root);
    const storage = new DiskDocumentStorage(root);
    const bytes = new TextEncoder().encode("%PDF-test");
    const key = await storage.save({ placementId: "placement-id", fileName: "../../unsafe.pdf", mimeType: "application/pdf", bytes });
    expect(key).toMatch(/^placement-id\/[0-9a-f-]+\.pdf$/);
    expect(Array.from(await storage.read(key))).toEqual(Array.from(bytes));
    await storage.remove(key);
    expect(storage.read(key)).rejects.toBeDefined();
  });

  test("rejects keys that escape the upload directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "trainy-documents-")); temporaryDirectories.push(root);
    expect(() => new DiskDocumentStorage(root).read("../secret")).toThrow("Invalid document storage key");
  });
});
