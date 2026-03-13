import { existsSync, mkdirSync } from "fs";
import path from "node:path";

import type { ApiConfig } from "../config";

export function ensureAssetsDir(cfg: ApiConfig) {
  if (!existsSync(cfg.assetsRoot)) {
    mkdirSync(cfg.assetsRoot, { recursive: true });
  }
}

export function mediaTypeToExt(mediaType: string) {
  return mediaType.split("/")[1];
}

export function getAssetDiskPath(
  cfg: ApiConfig,
  videoId: string,
  fileExtension: string,
) {
  return path.join(cfg.assetsRoot, `${videoId}.${fileExtension}`);
}
