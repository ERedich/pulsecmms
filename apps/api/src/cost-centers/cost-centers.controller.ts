import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import {
  JwtAuthGuard,
  type AuthenticatedRequest,
} from "../auth/jwt-auth.guard";
import { CostCentersService } from "./cost-centers.service";
import { CreateCostCenterDto } from "./dto/create-cost-center.dto";
import { UpdateCostCenterDto } from "./dto/update-cost-center.dto";

@Controller("cost-centers")
@UseGuards(JwtAuthGuard)
export class CostCentersController {
  constructor(private readonly costCenters: CostCentersService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.costCenters.listForSite(this.requireSiteUid(req));
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() body: CreateCostCenterDto) {
    return this.costCenters.createForSite(this.requireSiteUid(req), body);
  }

  @Get(":key")
  getOne(@Req() req: AuthenticatedRequest, @Param("key") key: string) {
    return this.costCenters.getForSite(this.requireSiteUid(req), key);
  }

  @Patch(":key")
  update(
    @Req() req: AuthenticatedRequest,
    @Param("key") key: string,
    @Body() body: UpdateCostCenterDto,
  ) {
    return this.costCenters.updateForSite(
      this.requireSiteUid(req),
      key,
      body,
    );
  }

  @Delete(":key")
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param("key") key: string,
  ): Promise<{ ok: true }> {
    await this.costCenters.deleteForSite(this.requireSiteUid(req), key);
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
