import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import { access } from "node:fs/promises";
import { absoluteThumbnailPath } from "../assets/asset-thumbnail.storage";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

@Controller("uploads")
export class UploadsController {
  @Get("assets/:filename")
  async getAssetThumbnail(
    @Param("filename") filename: string,
    @Res() res: Response,
  ): Promise<void> {
    if (
      !filename ||
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\\")
    ) {
      throw new NotFoundException();
    }

    const ext = filename.split(".").pop()?.toLowerCase() ?? "";
    const contentType = CONTENT_TYPES[ext];
    if (!contentType) {
      throw new NotFoundException();
    }

    const absolute = absoluteThumbnailPath(filename);
    try {
      await access(absolute);
    } catch {
      throw new NotFoundException();
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.sendFile(absolute);
  }
}
