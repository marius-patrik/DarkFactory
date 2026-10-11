import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { chmod, mkdir, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";

// Source-free release installation: immutable versioned binaries and stable shims.
// Credentials, existing wrappers, unrelated project files and policies are never rewritten.
const UPSTREAM = "marius-patrik/DarkFactory";
const API = `https://api.github.com/repos/${UPSTREAM}/releases/latest`;
const TAG = /^v[0-9][A-Za-z0-9.+-]*$/;
const DIGEST = /^sha256:([0-9a-f]{64})$/;
const MANAGED = "df-release-installer-managed v1";
const MAX_BINARY_BYTES = 300_000_000;

export interface PublishedBinary {
  tag: string;
  asset: string;
  url: string;
  digest: string;
  bytes: number;
}

export function assetForPlatform(platform: NodeJS.Platform, arch: string): string {
  if (!["linux", "darwin", "win32"].includes(platform) || !["x64", "arm64"].includes(arch))
    throw new Error(`No published df binary for ${platform}/${arch}`);
  if (platform === "win32" && arch === "arm64")
    throw new Error("Windows ARM64 has no published df binary");
  return `df-${platform}-${arch}${platform === "win32" ? ".exe" : ""}`;
}

export function selectPublishedBinary(data: unknown, asset: string): PublishedBinary {
  if (!data || typeof data !== "object") throw new Error("Invalid GitHub release metadata");
  const release = data as {
    tag_name?: unknown;
    draft?: boolean;
    prerelease?: boolean;
    assets?: Array<{ name?: string; digest?: string; browser_download_url?: string; size?: number }>;
  };
  if (release.draft || release.prerelease || typeof release.tag_name !== "string" || !TAG.test(release.tag_name))
    throw new Error("No valid published stable DarkFactory release");
  const candidate = release.assets?.find((item) => item.name === asset);
  const digest = candidate?.digest?.match(DIGEST)?.[1];
  const expected = `https://github.com/${UPSTREAM}/releases/download/${release.tag_name}/${asset}`;
  if (!candidate || !digest || candidate.browser_download_url !== expected)
    throw new Error(`Missing checksum-verified published artifact: ${asset}`);
  if (!Number.isSafeInteger(candidate.size) || candidate.size! <= 0 || candidate.size! > MAX_BINARY_BYTES)
    throw new Error(`Invalid published binary size for ${asset}`);
  return { tag: release.tag_name, asset, url: expected, digest, bytes: candidate.size! };
}

export function managedWrapper(platform: NodeJS.Platform, asset: string): string {
  if (platform === "win32")
    return `@echo off\r\nrem ${MANAGED}\r\nsetlocal DisableDelayedExpansion\r\nset /p DF_RELEASE=<"%~dp0..\\current.txt"\r\n"%~dp0..\\versions\\%DF_RELEASE%\\${asset}" %*\r\nexit /b %ERRORLEVEL%\r\n`;
  return `#!/usr/bin/env sh\n# ${MANAGED}\nset -eu\nDF_HOME=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)\nIFS= read -r DF_RELEASE < "$DF_HOME/current.txt"\nexec "$DF_HOME/versions/$DF_RELEASE/${asset}" "$@"\n`;
}

export function executableReleaseVersion(path = process.execPath): string | undefined {
  const fragments = resolve(path).split(sep);
  const i = fragments.lastIndexOf("versions");
  const tag = fragments[i + 1];
  return i >= 0 && tag && TAG.test(tag) ? tag : undefined;
}

function parseFlags(args: string[]): { prefix: string; check: boolean; dryRun: boolean } {
  let prefix = join(homedir(), ".darkfactory"), check = false, dryRun = false;
  for (let index = 0; index < args.length; index++) {
    const option = args[index];
    if (option === "--prefix") {
      const value = args[++index];
      if (!value || value.startsWith("--")) throw new Error("--prefix requires a directory");
      prefix = resolve(value);
    } else if (option === "--check") check = true;
    else if (option === "--dry-run") dryRun = true;
    else throw new Error(`Unknown install/update option: ${option}`);
  }
  return { prefix, check, dryRun };
}

async function existingText(path: string): Promise<string | null> {
  try { return await readFile(path, "utf8"); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function atomicWrite(path: string, data: string | Uint8Array, mode?: number): Promise<void> {
  const temporary = `${path}.tmp-${randomUUID()}`;
  try {
    await writeFile(temporary, data, { flag: "wx", ...(mode ? { mode } : {}) });
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
}

async function fetchRelease(fetchImpl: typeof fetch): Promise<PublishedBinary> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "darkfactory-release-installer",
  };
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetchImpl(API, { headers });
  if (!response.ok) throw new Error(`GitHub release lookup returned HTTP ${response.status}`);
  return selectPublishedBinary(await response.json(), assetForPlatform(process.platform, process.arch));
}

async function verifiedBytes(release: PublishedBinary, fetchImpl: typeof fetch): Promise<Uint8Array> {
  // Do not forward API credentials to release-asset redirect destinations.
  const response = await fetchImpl(release.url, { headers: { "User-Agent": "darkfactory-release-installer" } });
  if (!response.ok) throw new Error(`Binary download returned HTTP ${response.status}`);
  const length = Number(response.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_BINARY_BYTES) throw new Error("Binary download exceeds size limit");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length !== release.bytes || bytes.length > MAX_BINARY_BYTES)
    throw new Error("Downloaded binary length differs from the published release asset");
  if (createHash("sha256").update(bytes).digest("hex") !== release.digest)
    throw new Error("Downloaded binary checksum mismatch; nothing installed");
  return bytes;
}

export async function runReleasedInstaller(command: "install" | "update", args: string[], fetchImpl: typeof fetch = fetch): Promise<void> {
  const flags = parseFlags(args);
  const asset = assetForPlatform(process.platform, process.arch);
  const wrapperName = process.platform === "win32" ? "df.cmd" : "df";
  const wrapperPath = join(flags.prefix, "bin", wrapperName);
  const pointerPath = join(flags.prefix, "current.txt");
  const wrapper = managedWrapper(process.platform, asset);
  const oldWrapper = await existingText(wrapperPath);
  const oldVersion = (await existingText(pointerPath))?.trim();
  if (oldWrapper !== null && oldWrapper !== wrapper)
    throw new Error(`Unmanaged or modified wrapper ${wrapperPath}; refusing overwrite.`);
  if (oldVersion && !TAG.test(oldVersion)) throw new Error("Invalid current.txt version pointer");
  if (command === "update" && !oldVersion) throw new Error("No managed installation; run df install first.");
  if (oldVersion && !oldWrapper) throw new Error("Version pointer exists without its managed wrapper");
  const release = await fetchRelease(fetchImpl);
  const target = join(flags.prefix, "versions", release.tag, release.asset);
  console.log(`DarkFactory: installed ${oldVersion ?? "none"}; published ${release.tag}`);
  if (flags.check || flags.dryRun) {
    console.log("No files changed.");
    return;
  }
  if (oldVersion === release.tag && existsSync(target)) {
    const hash = createHash("sha256").update(await readFile(target)).digest("hex");
    if (hash !== release.digest) throw new Error("Installed binary checksum mismatch");
    console.log("Already on latest verified df release.");
    return;
  }
  await mkdir(flags.prefix, { recursive: true });
  const lockPath = join(flags.prefix, ".install.lock");
  let lock;
  try { lock = await open(lockPath, "wx", 0o600); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST")
      throw new Error(`Concurrent df installation detected (${lockPath})`);
    throw error;
  }
  try {
    const observed = (await existingText(pointerPath))?.trim() ?? null;
    if (observed !== (oldVersion ?? null)) throw new Error("Installed version changed concurrently");
    const bytes = await verifiedBytes(release, fetchImpl);
    await mkdir(dirname(target), { recursive: true });
    if (existsSync(target)) {
      const oldHash = createHash("sha256").update(await readFile(target)).digest("hex");
      if (oldHash !== release.digest) throw new Error(`Existing ${target} has modified content`);
    } else {
      await atomicWrite(target, bytes, 0o755);
      if (process.platform !== "win32") await chmod(target, 0o755);
    }
    await mkdir(dirname(wrapperPath), { recursive: true });
    const latestWrapper = await existingText(wrapperPath);
    if (latestWrapper !== null && latestWrapper !== wrapper) throw new Error("Wrapper modified during update");
    if (latestWrapper === null) {
      await writeFile(wrapperPath, wrapper, { flag: "wx", mode: 0o755 });
      if (process.platform !== "win32") await chmod(wrapperPath, 0o755);
    }
    await atomicWrite(pointerPath, `${release.tag}\n`, 0o600);
    console.log(`Installed DarkFactory ${release.tag} in ${flags.prefix}`);
    console.log(`Add ${join(flags.prefix, "bin")} to PATH to invoke the managed df.`);
  } finally {
    await lock.close();
    await rm(lockPath, { force: true });
  }
}
