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
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.users.listForSite(this.requireSiteUid(req));
  }

  @Get("site-options")
  siteOptions(@Req() req: AuthenticatedRequest) {
    return this.users.listSecondarySiteOptions(this.requireSiteUid(req));
  }

  @Get("employee-options")
  employeeOptions(@Req() req: AuthenticatedRequest) {
    return this.users.listEmployeeOptions(this.requireSiteUid(req));
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() body: CreateUserDto) {
    return this.users.createForSite(this.requireSiteUid(req), body);
  }

  @Get(":key")
  getOne(@Req() req: AuthenticatedRequest, @Param("key") key: string) {
    return this.users.getForSite(this.requireSiteUid(req), key);
  }

  @Patch(":key")
  update(
    @Req() req: AuthenticatedRequest,
    @Param("key") key: string,
    @Body() body: UpdateUserDto,
  ) {
    return this.users.updateForSite(this.requireSiteUid(req), key, body);
  }

  @Delete(":key")
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param("key") key: string,
  ): Promise<{ ok: true }> {
    const actorUid = req.user?.sub;
    if (!actorUid) {
      throw new UnauthorizedException();
    }
    await this.users.deleteForSite(this.requireSiteUid(req), key, actorUid);
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
