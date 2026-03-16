import { getBearerToken, validateJWT } from "../auth";
import { respondWithJSON } from "./json";
import { getVideo, updateVideo } from "../db/videos";
import type { ApiConfig } from "../config";
import { file, type BunRequest } from "bun";
import path from "node:path";
import { BadRequestError, NotFoundError, UserForbiddenError } from "./errors";
import { getAssetDiskPath, getAssetURL, mediaTypeToExt } from "./assets";

type Thumbnail = {
  data: ArrayBuffer;
  mediaType: string;
};

const videoThumbnails: Map<string, Thumbnail> = new Map();

export async function handlerUploadThumbnail(cfg: ApiConfig, req: BunRequest) {
  const { videoId } = req.params as { videoId?: string };
  if (!videoId) {
    throw new BadRequestError("Invalid video ID");
  }

  const token = getBearerToken(req.headers);
  const userID = validateJWT(token, cfg.jwtSecret);

  const video = getVideo(cfg.db, videoId);
  console.log(video);
  if (!video) {
    throw new NotFoundError("Could not find video");
  }

  if (video.userID !== userID) {
    throw new UserForbiddenError("Not authorized to update this video");
  }

  console.log("uploading thumbnail for video", videoId, "by user", userID);

  const formData = await req.formData();
  const file = formData.get("thumbnail");

  if (!(file instanceof File)) {
    throw new BadRequestError("Thumbnail file missing");
  }

  // 10 before shift
  //* 00000000 00000000 00000000 00001010
  // after shift
  //* 00000000 00010100 00000000 00000000
  const MAX_UPLOAD_SIZE = 10 << 20; // bit shifted 10MB = (10 * 1024 * 1024)

  if (file.size > MAX_UPLOAD_SIZE) {
    throw new BadRequestError("Thumbnails cannot be larger than 10MB");
  }

  const mediaType = file.type;
  if (!mediaType) {
    throw new BadRequestError("Missing Content-Type for thumbnail");
  }

  const fileData = await file.arrayBuffer();
  if (!fileData) {
    throw new Error("Error reading file data");
  }

  const ext = mediaTypeToExt(mediaType);
  const fileName = `${videoId}${ext}`;

  const assetDiskPath = getAssetDiskPath(cfg, fileName);
  await Bun.write(assetDiskPath, fileData);

  const thumbnailURL = getAssetURL(cfg, fileName);
  video.thumbnailURL = thumbnailURL;

  updateVideo(cfg.db, video);

  return respondWithJSON(200, video);
}
