import JSZip from "jszip";

import type { GeneratedFile } from "./types";

/**
 * Normalizes a generated file path for use inside a ZIP.
 * Converts "\" to "/", strips a leading "./" and collapses duplicate slashes.
 * Throws on empty, absolute (including drive letters) or ".." paths.
 */
export function normalizeZipPath(path: string): string {
  const unified = path.replace(/\\/g, "/");

  if (unified.startsWith("/") || /^[a-zA-Z]:/.test(unified)) {
    throw new Error(`Unsafe file path (absolute): "${path}"`);
  }

  const segments = unified.split("/").filter((s) => s !== "" && s !== ".");

  if (segments.some((s) => s === "..")) {
    throw new Error(`Unsafe file path (parent traversal): "${path}"`);
  }
  if (segments.length === 0) {
    throw new Error(`Invalid file path: "${path}"`);
  }

  return segments.join("/");
}

/**
 * Packages generated files into a ZIP archive. Works in Node and the browser.
 * Paths are normalized; unsafe or duplicate paths throw.
 * Output is deterministic (fixed file dates) so equal input gives equal bytes.
 */
export async function packageProject(files: GeneratedFile[]): Promise<Uint8Array> {
  const zip = new JSZip();
  const seen = new Set<string>();
  const date = new Date(Date.UTC(2020, 0, 1));

  for (const file of files) {
    const path = normalizeZipPath(file.path);
    if (seen.has(path)) {
      throw new Error(`Duplicate file path: "${path}"`);
    }
    seen.add(path);
    zip.file(path, file.content, { date });
  }

  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
