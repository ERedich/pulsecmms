import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateSiteDto } from "./dto/create-site.dto";
import { UpdateSiteDto } from "./dto/update-site.dto";
import { SitesService } from "./sites.service";

@Controller("sites")
@UseGuards(JwtAuthGuard)
export class SitesController {
  constructor(private readonly sites: SitesService) {}

  @Get()
  list() {
    return this.sites.list();
  }

  @Post()
  create(@Body() body: CreateSiteDto) {
    return this.sites.create(body);
  }

  @Get(":key")
  getOne(@Param("key") key: string) {
    return this.sites.getByKey(key);
  }

  @Patch(":key")
  update(@Param("key") key: string, @Body() body: UpdateSiteDto) {
    return this.sites.update(key, body);
  }

  @Delete(":key")
  async remove(@Param("key") key: string): Promise<{ ok: true }> {
    await this.sites.delete(key);
    return { ok: true };
  }
}
