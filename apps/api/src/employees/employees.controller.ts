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
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";
import { EmployeesService } from "./employees.service";

@Controller("employees")
@UseGuards(JwtAuthGuard)
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.employees.listForSite(this.requireSiteUid(req));
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() body: CreateEmployeeDto) {
    return this.employees.createForSite(this.requireSiteUid(req), body);
  }

  @Get(":key")
  getOne(@Req() req: AuthenticatedRequest, @Param("key") key: string) {
    return this.employees.getForSite(this.requireSiteUid(req), key);
  }

  @Patch(":key")
  update(
    @Req() req: AuthenticatedRequest,
    @Param("key") key: string,
    @Body() body: UpdateEmployeeDto,
  ) {
    return this.employees.updateForSite(this.requireSiteUid(req), key, body);
  }

  @Delete(":key")
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param("key") key: string,
  ): Promise<{ ok: true }> {
    await this.employees.deleteForSite(this.requireSiteUid(req), key);
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
