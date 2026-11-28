import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { memoryStorage } from "multer";
import {
  JwtAuthGuard,
  type AuthenticatedRequest,
} from "../auth/jwt-auth.guard";
import { DOCUMENT_MAX_BYTES } from "./document.storage";
import { DocumentsService } from "./documents.service";

@Controller("documents")
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  list(
    @Req() req: AuthenticatedRequest,
    @Query("app") app: string | undefined,
    @Query("recordKey") recordKey: string | undefined,
  ) {
    return this.documents.listForSite(
      this.requireSiteUid(req),
      app,
      recordKey,
    );
  }

  @Get("counts")
  counts(
    @Req() req: AuthenticatedRequest,
    @Query("app") app: string | undefined,
  ) {
    return this.documents.countsForSite(this.requireSiteUid(req), app);
  }

  @Post("assets/:key")
  @UseInterceptors(
    FilesInterceptor("file", 20, {
      storage: memoryStorage(),
      limits: { fileSize: DOCUMENT_MAX_BYTES },
      // Browsers send UTF-8 filenames without a charset. Multer's latin1
      // default stores ä/ö/ü as mojibake.
      defParamCharset: "utf8",
    }),
  )
  upload(
    @Req() req: AuthenticatedRequest,
    @Param("key") key: string,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException("Dokument-Datei fehlt");
    }
    return this.documents.uploadForAsset(
      this.requireSiteUid(req),
      key,
      files.map((file) => ({
        originalname: file.originalname,
        size: file.size,
        buffer: file.buffer,
      })),
    );
  }

  @Get("assets/:key/:filename")
  async download(
    @Req() req: AuthenticatedRequest,
    @Param("key") key: string,
    @Param("filename") filename: string,
    @Res() res: Response,
  ): Promise<void> {
    const resolved = await this.documents.resolveDownloadPath(
      this.requireSiteUid(req),
      key,
      filename,
    );
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(resolved.filename)}`,
    );
    res.setHeader("Cache-Control", "private, no-store");
    res.sendFile(resolved.absolute);
  }

  @Delete("assets/:key/:filename")
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param("key") key: string,
    @Param("filename") filename: string,
  ): Promise<{ ok: true }> {
    await this.documents.deleteForAsset(
      this.requireSiteUid(req),
      key,
      filename,
    );
    return { ok: true };
  }

  private requireSiteUid(req: AuthenticatedRequest): string {
    const siteUid = req.user?.siteUid;
    if (!siteUid) {
      throw new UnauthorizedException();
    }
    return siteUid;
  }
}
