import "server-only";
import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Real marketing photos aren't in the repo yet. Sections call this on the server
 * to decide whether to render the real <Image> or a graceful designed fallback
 * (a navy gradient / styled mock) — so the build stays clean until files land in
 * public/photos/. Drop a file at the given public path and it renders itself; no
 * code change needed.
 *
 * Pass a path relative to /public, e.g. "photos/hero-pool.jpg".
 */
export function publicPhotoExists(relPath: string): boolean {
  return existsSync(join(process.cwd(), "public", relPath));
}
