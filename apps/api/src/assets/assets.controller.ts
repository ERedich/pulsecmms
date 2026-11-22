import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import {
  JwtAuthGuard,
  type AuthenticatedRequest,
} from "../auth/jwt-auth.guard";
import { ASSET_THUMBNAIL_MAX_BYTES } from "./asset-thumbnail.storage";
import { AssetsService } from "./assets.service";
import { CreateAssetDto } from "./dto/create-asset.dto";
import { UpdateAssetDto } from "./dto/update-asset.dto";

@Controller("assets")
@UseGuards(JwtAuthGuard)
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.assets.listForSite(this.requireSiteUid(req));
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() body: CreateAssetDto) {
    return this.assets.createForSite(this.requireSiteUid(req), body);
  }

  @Get(":key")
  getOne(@Req() req: AuthenticatedRequest, @Param("key") key: string) {
    return this.assets.getForSite(this.requireSiteUid(req), key);
  }

  @Patch(":key")
  update(
    @Req() req: AuthenticatedRequest,
    @Param("key") key: string,
    @Body() body: UpdateAssetDto,
  ) {
    return this.assets.updateForSite(this.requireSiteUid(req), key, body);
  }

  @Post(":key/thumbnail")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: ASSET_THUMBNAIL_MAX_BYTES },
    }),
  )
  uploadThumbnail(
    @Req() req: AuthenticatedRequest,
    @Param("key") key: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      throw new BadRequestException("Thumbnail-Datei fehlt");
    }
    return this.assets.setThumbnailForSite(this.requireSiteUid(req), key, {
      mimetype: file.mimetype,
      size: file.size,
      buffer: file.buffer,
    });
  }

  @Delete(":key/thumbnail")
  clearThumbnail(
    @Req() req: AuthenticatedRequest,
    @Param("key") key: string,
  ) {
    return this.assets.clearThumbnailForSite(this.requireSiteUid(req), key);
  }

  @Delete(":key")
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param("key") key: string,
  ): Promise<{ ok: true }> {
    await this.assets.deleteForSite(this.requireSiteUid(req), key);
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
