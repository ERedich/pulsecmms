import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { UsersService } from "../users/users.service";
import type { JwtPayload } from "./auth.types";
import type { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.users.findByLoginName(dto.loginName.trim());
    if (!user) {
      throw new UnauthorizedException("Ungültige Anmeldedaten");
    }

    const valid = await argon2.verify(user.password_hash, dto.password);
    if (!valid) {
      throw new UnauthorizedException("Ungültige Anmeldedaten");
    }

    const publicUser = await this.users.toPublic(user);
    const authUser = this.users.toAuthPublic(publicUser);
    const payload: JwtPayload = {
      sub: user.uid,
      siteUid: user.fk_site,
      siteKey: authUser.primarySite.key,
    };

    const expiresIn = dto.rememberMe ? "30d" : "8h";
    const accessToken = await this.jwt.signAsync(payload, { expiresIn });

    return {
      accessToken,
      user: authUser,
    };
  }

  async me(userUid: string) {
    const user = await this.users.findByUid(userUid);
    if (!user) {
      throw new UnauthorizedException();
    }
    return this.users.toAuthPublic(await this.users.toPublic(user));
  }
}
