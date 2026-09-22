import type { GithubTreeEntry } from "@/github/client";
import type { CommittedFile, WorkingFile } from "./model";

const encoder = new TextEncoder();

function lines(value: string) {
  const normalized = value.replace(/\r\n/g, "\n");
  if (!normalized) return [];
  const split = normalized.split("\n");
  if (split.at(-1) === "") split.pop();
  return split;
}

export function wholeFilePatch(path: string, before: string | null, after: string | null) {
  const beforeLines = lines(before ?? "");
  const afterLines = lines(after ?? "");
  const from = before === null ? "/dev/null" : `a/${path}`;
  const to = after === null ? "/dev/null" : `b/${path}`;
  const body = [
    `diff --git a/${path} b/${path}`,
    `--- ${from}`,
    `+++ ${to}`,
    `@@ -1,${beforeLines.length} +1,${afterLines.length} @@`,
    ...beforeLines.map((line) => `-${line}`),
    ...afterLines.map((line) => `+${line}`),
    "",
  ];
  return body.join("\n");
}

export function downloadBytes(bytes: Uint8Array, filename: string, type: string) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy.buffer], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function downloadText(value: string, filename: string, type = "text/plain;charset=utf-8") {
  downloadBytes(encoder.encode(value), filename, type);
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function write16(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
}

function write32(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = (value >>> 16) & 0xff;
  target[offset + 3] = (value >>> 24) & 0xff;
}

export type ZipFile = { path: string; bytes: Uint8Array };

export function createStoredZip(files: ZipFile[]) {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.path);
    const checksum = crc32(file.bytes);
    const local = new Uint8Array(30 + name.length + file.bytes.length);
    write32(local, 0, 0x04034b50);
    write16(local, 4, 20);
    write16(local, 6, 0x0800);
    write16(local, 8, 0);
    write16(local, 10, 0);
    write16(local, 12, 0);
    write32(local, 14, checksum);
    write32(local, 18, file.bytes.length);
    write32(local, 22, file.bytes.length);
    write16(local, 26, name.length);
    write16(local, 28, 0);
    local.set(name, 30);
    local.set(file.bytes, 30 + name.length);
    localParts.push(local);

    const central = new Uint8Array(46 + name.length);
    write32(central, 0, 0x02014b50);
    write16(central, 4, 20);
    write16(central, 6, 20);
    write16(central, 8, 0x0800);
    write16(central, 10, 0);
    write16(central, 12, 0);
    write16(central, 14, 0);
    write32(central, 16, checksum);
    write32(central, 20, file.bytes.length);
    write32(central, 24, file.bytes.length);
    write16(central, 28, name.length);
    write16(central, 30, 0);
    write16(central, 32, 0);
    write16(central, 34, 0);
    write16(central, 36, 0);
    write32(central, 38, 0);
    write32(central, 42, offset);
    central.set(name, 46);
    centralParts.push(central);
    offset += local.length;
  }

  const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
  const end = new Uint8Array(22);
  write32(end, 0, 0x06054b50);
  write16(end, 4, 0);
  write16(end, 6, 0);
  write16(end, 8, files.length);
  write16(end, 10, files.length);
  write32(end, 12, centralSize);
  write32(end, 16, offset);
  write16(end, 20, 0);

  const totalSize = offset + centralSize + end.length;
  const output = new Uint8Array(totalSize);
  let cursor = 0;
  for (const part of localParts) {
    output.set(part, cursor);
    cursor += part.length;
  }
  for (const part of centralParts) {
    output.set(part, cursor);
    cursor += part.length;
  }
  output.set(end, cursor);
  return output;
}

export type VirtualFile = {
  path: string;
  sha?: string;
  content?: string;
};

export function virtualFiles(
  tree: GithubTreeEntry[],
  committed: CommittedFile[],
  overlays: WorkingFile[],
) {
  const files = new Map<string, VirtualFile>();
  for (const entry of tree) {
    if (entry.type === "blob") files.set(entry.path, { path: entry.path, sha: entry.sha });
  }
  for (const file of committed) {
    if (file.deleted) files.delete(file.path);
    else files.set(file.path, { path: file.path, content: file.content });
  }
  for (const file of overlays) {
    if (file.status === "deleted") files.delete(file.path);
    else files.set(file.path, { path: file.path, content: file.content });
  }
  return [...files.values()].sort((left, right) => left.path.localeCompare(right.path));
}
