import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import {
  JwtAuthGuard,
  type AuthenticatedRequest,
} from "../auth/jwt-auth.guard";
import { UpdateSettingDto } from "./dto/update-setting.dto";
import { SettingsService } from "./settings.service";

@Controller("settings")
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.settings.listForSite(this.requireSiteUid(req));
  }

  @Get(":key")
  getOne(@Req() req: AuthenticatedRequest, @Param("key") key: string) {
    return this.settings.getForSite(this.requireSiteUid(req), key);
  }

  @Patch(":key")
  update(
    @Req() req: AuthenticatedRequest,
    @Param("key") key: string,
    @Body() body: UpdateSettingDto,
  ) {
    return this.settings.updateForSite(
      this.requireSiteUid(req),
      key,
      body,
    );
  }

  private requireSiteUid(req: AuthenticatedRequest): string {
    const siteUid = req.user?.siteUid;
    if (!siteUid) {
      throw new UnauthorizedException();
    }
    return siteUid;
  }
}
